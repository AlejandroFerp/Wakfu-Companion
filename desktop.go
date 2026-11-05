package main

import (
	"archive/zip"
	"bytes"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
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
	logPath := filepath.Join(appdata, "zaap", "gamesLogs", "wakfu", "logs", "wakfu_chat.log")
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
	mux.HandleFunc(prefix+"api/log", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "Method not allowed", 405)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		http.ServeFile(w, r, logPath)
	})
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
	profile := filepath.Join(appdata, "WakfuCompanionDesktop", "EdgeProfile")
	if err = exec.Command(edge, "--app="+url, "--user-data-dir="+profile, "--no-first-run").Start(); err != nil {
		log.Fatal(err)
	}
	log.Printf("Wakfu Companion abierto. Cierra la aplicación con el botón Salir. Ruta local: %s", url)
	log.Fatal(http.Serve(listener, mux))
}

const desktopJS = `
window.addEventListener('DOMContentLoaded', () => {
 const base = new URL('.', location.href);
 const quit = document.createElement('button');
 quit.textContent = 'Salir de la aplicación'; quit.title = 'Cierra el servicio local de Wakfu Companion';
 quit.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;background:#173541;color:white;border:1px solid #00d5ff;border-radius:5px;padding:8px;cursor:pointer';
 quit.onclick = async () => { try { await fetch(new URL('api/quit',base),{method:'POST'}); } finally { window.close(); document.body.innerHTML='<p style="color:white;padding:2em">Aplicación cerrada. Puedes cerrar esta ventana.</p>'; } };
 document.body.appendChild(quit);
 const handle = { name:'wakfu_chat.log', async getFile() { const r=await fetch(new URL('api/log',base),{cache:'no-store'}); if (!r.ok) throw new Error('No se puede leer wakfu_chat.log ('+r.status+')'); return new File([await r.arrayBuffer()],'wakfu_chat.log'); } };
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
