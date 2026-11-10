package server_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"embsay/internal/server"
)

func TestStaticAssetsServing(t *testing.T) {
	webFS := os.DirFS("../../web")
	srv := server.NewServer(nil, webFS)

	paths := []struct {
		url          string
		expectedCode int
	}{
		{"/", http.StatusOK},
		{"/styles.css", http.StatusOK},
		{"/js/app.js", http.StatusOK},
		{"/js/portfolio.js", http.StatusOK},
		{"/js/securities.js", http.StatusOK},
		{"/js/port_mgmt.js", http.StatusOK},
		{"/js/config.js", http.StatusOK},
	}

	for _, tc := range paths {
		req := httptest.NewRequest(http.MethodGet, tc.url, nil)
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)

		if rec.Code != tc.expectedCode {
			t.Errorf("GET %s returned status %d, expected %d", tc.url, rec.Code, tc.expectedCode)
		}
		if rec.Body.Len() == 0 {
			t.Errorf("GET %s returned empty body", tc.url)
		}
	}
}

func TestBrowseDirectoryRoute(t *testing.T) {
	webFS := os.DirFS("../../web")
	srv := server.NewServer(nil, webFS)
	srv.SetBrowseDirectory(func() string {
		return "/tmp/portfolios"
	})

	req := httptest.NewRequest(http.MethodGet, "/api/browse-directory", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/browse-directory returned status %d, expected 200", rec.Code)
	}
	var resp map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}
	if resp["path"] != "/tmp/portfolios" {
		t.Errorf("Expected path '/tmp/portfolios', got %q", resp["path"])
	}
}

func TestQuitRoute(t *testing.T) {
	webFS := os.DirFS("../../web")
	srv := server.NewServer(nil, webFS)

	var exitCalled atomic.Bool
	srv.SetOnExit(func() {
		exitCalled.Store(true)
	})

	req := httptest.NewRequest(http.MethodPost, "/api/quit", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("POST /api/quit returned status %d, expected 200", rec.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode quit response: %v", err)
	}
	if resp["status"] != "shutting_down" {
		t.Errorf("Expected status 'shutting_down', got %q", resp["status"])
	}

	// Verify that onExit is invoked within 500ms
	time.Sleep(400 * time.Millisecond)
	if !exitCalled.Load() {
		t.Errorf("Expected onExit callback to be invoked after quit request")
	}
}

func TestActivityAndBackgroundHandling(t *testing.T) {
	webFS := os.DirFS("../../web")
	srv := server.NewServer(nil, webFS)

	time.Sleep(5 * time.Millisecond)
	prevTime := srv.LastInteractionTime()

	// 1. Silent background refresh should NOT update interaction time
	time.Sleep(10 * time.Millisecond)
	bgReq := httptest.NewRequest(http.MethodPost, "/api/refresh/prices?silent=true", nil)
	bgReq.Header.Set("X-Background", "true")
	bgRec := httptest.NewRecorder()
	srv.ServeHTTP(bgRec, bgReq)

	if srv.LastInteractionTime().After(prevTime) {
		t.Errorf("Background request should not update LastInteractionTime")
	}

	// 2. Explicit /api/activity should update interaction time
	time.Sleep(10 * time.Millisecond)
	actReq := httptest.NewRequest(http.MethodPost, "/api/activity", nil)
	actRec := httptest.NewRecorder()
	srv.ServeHTTP(actRec, actReq)

	if actRec.Code != http.StatusOK {
		t.Errorf("POST /api/activity returned %d, expected 200", actRec.Code)
	}
	if !srv.LastInteractionTime().After(prevTime) {
		t.Errorf("Explicit /api/activity should update LastInteractionTime")
	}
}

func TestCheckIdleTimeout(t *testing.T) {
	webFS := os.DirFS("../../web")
	srv := server.NewServer(nil, webFS)

	var exited atomic.Bool
	srv.SetOnExit(func() {
		exited.Store(true)
	})

	// 1. Recently active: should not trigger shutdown
	srv.SetLastInteractionTime(time.Now())
	if srv.CheckIdleTimeout() {
		t.Errorf("Expected CheckIdleTimeout to return false for recently active server")
	}
	if exited.Load() {
		t.Errorf("onExit should not be called when server was recently active")
	}

	// 2. Idle for > 1 hour (default timeout): should trigger shutdown
	srv.SetLastInteractionTime(time.Now().Add(-2 * time.Hour))
	if !srv.CheckIdleTimeout() {
		t.Errorf("Expected CheckIdleTimeout to return true when idle exceeds timeout")
	}
	if !exited.Load() {
		t.Errorf("Expected onExit callback to be invoked when idle exceeds timeout")
	}
}
