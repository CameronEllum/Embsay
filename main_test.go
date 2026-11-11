package main

import (
	"fmt"
	"net"
	"strconv"
	"testing"
)

func TestCreateListenerFallsBackWhenPortBusy(t *testing.T) {
	// Bind an initial port to simulate port already in use
	occupied, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to bind initial listener: %v", err)
	}
	defer occupied.Close()

	busyAddr := occupied.Addr().String()
	_, portStr, err := net.SplitHostPort(busyAddr)
	if err != nil {
		t.Fatalf("SplitHostPort failed: %v", err)
	}
	busyPort, _ := strconv.Atoi(portStr)

	l2, actualAddr, err := createListener(busyAddr)
	if err != nil {
		t.Fatalf("createListener fallback failed: %v", err)
	}
	defer l2.Close()

	if actualAddr == busyAddr {
		t.Fatalf("expected createListener to choose a different address than busy %s", busyAddr)
	}

	_, newPortStr, err := net.SplitHostPort(actualAddr)
	if err != nil {
		t.Fatalf("SplitHostPort(actualAddr) failed: %v", err)
	}
	newPort, _ := strconv.Atoi(newPortStr)
	if newPort <= busyPort {
		t.Errorf("expected fallback port > %d, got %d (%s)", busyPort, newPort, fmt.Sprintf("actual=%s", actualAddr))
	}
}
