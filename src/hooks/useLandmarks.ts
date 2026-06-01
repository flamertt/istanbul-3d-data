import { useState, useEffect } from "react";
import type { Landmark, LandmarkData } from "../types";

export function useLandmarks() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);

  useEffect(() => {
    fetch("/data/istanbul_landmarks.json")
      .then((res) => res.json())
      .then((data: LandmarkData) => {
        setLandmarks(data.landmarks);
      })
      .catch((err) => console.error("Failed to load landmarks:", err));
  }, []);

  return landmarks;
}
