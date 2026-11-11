package main

import (
	"archive/zip"
	"bytes"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed desktop-assets.zip
var assets embed.FS

func main() {
	tokenBytes := make([]byte, 24)
	if _, err := rand.Read(tokenBytes); err != nil {
		log.Fatal(err)
	}
	token := hex.EncodeToString(tokenBytes)
	appdata, err := os.UserConfigDir()
	if err != nil {
		log.Fatal(err)
	}
	data, err := assets.ReadFile("desktop-assets.zip")
	if err != nil {
		log.Fatal(err)
	}
	archive, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		log.Fatal(err)
	}
	public, err := fs.Sub(archive, "public")
	if err != nil {
		log.Fatal(err)
	}
	prefix := "/" + token + "/"
	mux := http.NewServeMux()
	mux.HandleFunc(prefix+"api/log", desktopCombatLogHandler(appdata))
	mux.HandleFunc(prefix+"desktop.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		fmt.Fprint(w, desktopJS)
	})
	mux.HandleFunc(prefix+"api/quit", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", 405)
			return
		}
		w.WriteHeader(204)
		go func() { time.Sleep(250 * time.Millisecond); os.Exit(0) }()
	})
	mux.HandleFunc(prefix, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == prefix || r.URL.Path == prefix+"index.html" {
			b, e := fs.ReadFile(public, "index.html")
			if e != nil {
				http.Error(w, "missing interface", 500)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "no-store")
			fmt.Fprint(w, strings.Replace(string(b), "</body>", "<script src=\"desktop.js\"></script></body>", 1))
			return
		}
		http.StripPrefix(prefix, http.FileServer(http.FS(public))).ServeHTTP(w, r)
	})
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		log.Fatal(err)
	}
	url := "http://" + listener.Addr().String() + prefix
	edge := filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe")
	if _, err = os.Stat(edge); err != nil {
		edge = filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe")
	}
	if _, err = os.Stat(edge); err != nil {
		log.Fatal("Microsoft Edge no encontrado: ", err)
	}
	profile := filepath.Join(appdata, "WakfuCompanionDesktop", "EdgeAppProfile")
	if err = exec.Command(edge, "--app="+url, "--user-data-dir="+profile, "--no-first-run").Start(); err != nil {
		log.Fatal(err)
	}
	log.Printf("Wakfu Companion abierto. Cierra la aplicación con el botón Salir. Ruta local: %s", url)
	log.Fatal(http.Serve(listener, mux))
}

func desktopCombatLogHandler(appdata string) http.HandlerFunc {
	var mu sync.Mutex
	var serveLog http.HandlerFunc
	return func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		if serveLog == nil {
			if path := latestWakfuChatLog(appdata); path != "" {
				// Keep the same log directory for the lifetime of the desktop session.
				serveLog = combatLogHandler(path)
			}
		}
		handler := serveLog
		mu.Unlock()
		if handler == nil {
			w.Header().Set("Cache-Control", "no-store")
			http.Error(w, "Wakfu chat log not found", http.StatusServiceUnavailable)
			return
		}
		handler(w, r)
	}
}

func latestWakfuChatLog(appdata string) string {
	launcher2 := filepath.Join(appdata, "zaap2", "repositories", "production", "wakfu")
	candidates := []string{
		filepath.Join(launcher2, "main", "windows", "logs", "logs", "wakfu_chat.log"),
		filepath.Join(launcher2, "windows", "main", "logs", "logs", "wakfu_chat.log"),
		filepath.Join(appdata, "zaap", "gamesLogs", "wakfu", "logs", "wakfu_chat.log"),
	}
	var latest string
	var modified time.Time
	for _, path := range candidates {
		info, err := os.Stat(path)
		if err == nil && info.Mode().IsRegular() && (latest == "" || info.ModTime().After(modified)) {
			latest, modified = path, info.ModTime()
		}
	}
	return latest
}

func combatLogHandler(logPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		if r.URL.Query().Get("view") == "report" {
			data, err := readCombatReportLog(logPath)
			if err != nil {
				http.Error(w, "Combat log temporarily unavailable", http.StatusServiceUnavailable)
				return
			}
			w.Header().Set("Content-Type", "application/octet-stream")
			w.Write(data)
			return
		}
		http.ServeFile(w, r, logPath)
	}
}

func readCombatReportLog(logPath string) ([]byte, error) {
	active, start, err := snapshotActiveCombatLog(logPath)
	if err != nil {
		return nil, err
	}
	var report bytes.Buffer
	if err := appendArchivedCombatLogs(&report, logPath); err != nil {
		return nil, err
	}
	// If Wakfu rotated the file during the read, the archives and active file may overlap.
	end, err := os.Stat(logPath)
	if err != nil {
		return nil, err
	}
	if !os.SameFile(start, end) || end.Size() < start.Size() {
		return nil, fmt.Errorf("combat log rotated during report read")
	}
	report.Write(active)
	return report.Bytes(), nil
}

func snapshotActiveCombatLog(logPath string) ([]byte, fs.FileInfo, error) {
	// Release the active file before reading archives so Windows can rename it.
	current, err := os.Open(logPath)
	if err != nil {
		return nil, nil, err
	}
	defer current.Close()
	start, err := current.Stat()
	if err != nil {
		return nil, nil, err
	}
	var active bytes.Buffer
	if _, err := io.CopyN(&active, current, start.Size()); err != nil {
		return nil, nil, err
	}
	return active.Bytes(), start, nil
}

func appendArchivedCombatLogs(report *bytes.Buffer, logPath string) error {
	dir := filepath.Dir(logPath)
	prefix := filepath.Base(logPath) + "."
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	type archive struct {
		entry  os.DirEntry
		number uint64
	}
	var archives []archive
	for _, entry := range entries {
		suffix, matches := strings.CutPrefix(entry.Name(), prefix)
		if !matches || !entry.Type().IsRegular() {
			continue
		}
		number, err := strconv.ParseUint(suffix, 10, 64)
		if err == nil && number > 0 && strconv.FormatUint(number, 10) == suffix {
			archives = append(archives, archive{entry, number})
		}
	}
	sort.Slice(archives, func(i, j int) bool { return archives[i].number > archives[j].number })
	for _, archive := range archives {
		info, err := archive.entry.Info()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return fmt.Errorf("archived combat log is no longer a regular file")
		}
		if err := appendCombatLogArchive(report, filepath.Join(dir, archive.entry.Name()), info); err != nil {
			return err
		}
	}
	return nil
}

func appendCombatLogArchive(report *bytes.Buffer, path string, expected fs.FileInfo) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return err
	}
	if !os.SameFile(expected, info) {
		return fmt.Errorf("archived combat log rotated during report read")
	}
	if _, err := io.CopyN(report, file, info.Size()); err != nil {
		return err
	}
	if data := report.Bytes(); info.Size() > 0 && data[len(data)-1] != '\n' {
		report.WriteByte('\n')
	}
	return nil
}

const desktopJS = `
window.addEventListener('DOMContentLoaded', () => {
 const base = new URL('.', location.href);
 const quit = document.createElement('button');
 quit.textContent = 'Salir de la aplicación'; quit.title = 'Cierra el servicio local de Wakfu Companion';
 quit.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;background:#173541;color:white;border:1px solid #00d5ff;border-radius:5px;padding:8px;cursor:pointer';
 quit.onclick = async () => { try { await fetch(new URL('api/quit',base),{method:'POST'}); } finally { window.close(); document.body.innerHTML='<p style="color:white;padding:2em">Aplicación cerrada. Puedes cerrar esta ventana.</p>'; } };
 document.body.appendChild(quit);
 async function readLog(path) {
   const response = await fetch(new URL(path, base), { cache: 'no-store' });
   if (!response.ok) throw new Error('No se puede leer wakfu_chat.log (' + response.status + ')');
   return new File([await response.arrayBuffer()], 'wakfu_chat.log');
 }
 const handle = {
   name: 'wakfu_chat.log',
   getFile: () => readLog('api/log'),
   getReportFile: () => readLog('api/log?view=report'),
 };
 async function connect(){
   try {
     const file=await handle.getFile(); fileHandle=handle; resetLogReader();
     document.getElementById('setup-panel').style.display='none';
     activeFilename.textContent=handle.name+' (escritorio)'; liveIndicator.style.display='inline-block';
     fileOffset=file.size; if(parseIntervalId)clearInterval(parseIntervalId); parseIntervalId=setInterval(parseFile,1000); startWatchdog();
   } catch(e) { activeFilename.textContent='Esperando wakfu_chat.log'; setTimeout(connect,5000); }
 }
 connect();
});
`
