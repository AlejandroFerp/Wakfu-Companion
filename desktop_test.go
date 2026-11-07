package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestCombatLogAfterRotation(t *testing.T) {
	path := filepath.Join(t.TempDir(), "wakfu_chat.log")
	const previous = "16:50:55,125 - [Información (combate)] Player lanza Golpe."
	const current = "16:50:57,540 - [Información (combate)] Target: -200 PdV\n"
	const older = "16:45:00,000 - [Información (combate)] Combat terminé\n"
	const oldest = "16:40:00,000 - [Información (combate)] Combat terminé\n"
	for file, data := range map[string]string{
		path: current, path + ".1": previous, path + ".2": older,
		path + ".10": oldest, path + ".bak": "not a rotated log",
	} {
		if err := os.WriteFile(file, []byte(data), 0600); err != nil {
			t.Fatal(err)
		}
	}
	handler := combatLogHandler(path)
	for _, tc := range []struct {
		name, query, want string
	}{
		{"meter", "", current},
		{"report", "?view=report", oldest + older + previous + "\n" + current},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			handler(w, httptest.NewRequest(http.MethodGet, "/api/log"+tc.query, nil))
			if w.Code != http.StatusOK || w.Body.String() != tc.want {
				t.Fatalf("got %d and %q, want 200 and %q", w.Code, w.Body.String(), tc.want)
			}
		})
	}
}
