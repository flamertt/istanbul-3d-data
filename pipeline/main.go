package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}

	cmd := os.Args[1]
	args := os.Args[2:]

	var err error
	switch cmd {
	case "build-speed-profiles":
		err = runBuildSpeedProfiles(args)
	case "fetch-meters":
		err = runFetchMeters(args)
	case "fetch-enforcement":
		err = runFetchEnforcement(args)
	case "fetch-311":
		err = runFetch311(args)
	case "fetch-supply":
		err = runFetchSupply(args)
	case "compute-paths":
		err = runComputePaths(args)
	case "aggregate":
		err = runAggregate(args)
	case "aggregate-bikes":
		err = runAggregateBikes(args)
	case "compute-isochrones":
		err = runComputeIsochrones(args)
	case "mock-isochrones":
		err = runMockIsochrones(args)
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", cmd)
		usage()
		os.Exit(1)
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintln(os.Stderr, "Usage: pipeline <command> [args]")
	fmt.Fprintln(os.Stderr, "Commands:")
	fmt.Fprintln(os.Stderr, "  build-speed-profiles")
	fmt.Fprintln(os.Stderr, "  fetch-meters")
	fmt.Fprintln(os.Stderr, "  fetch-enforcement")
	fmt.Fprintln(os.Stderr, "  fetch-311 [--days N]")
	fmt.Fprintln(os.Stderr, "  fetch-supply")
	fmt.Fprintln(os.Stderr, "  compute-paths")
	fmt.Fprintln(os.Stderr, "  aggregate [--days N]")
	fmt.Fprintln(os.Stderr, "  aggregate-bikes [--months N]")
	fmt.Fprintln(os.Stderr, "  compute-isochrones [--valhalla-url URL] [--spacing F] [--tolerance F] [--modes M,M,M]")
	fmt.Fprintln(os.Stderr, "  mock-isochrones")
}
