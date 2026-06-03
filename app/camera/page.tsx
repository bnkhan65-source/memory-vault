"use client";

import { auth, db, storage } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, getDocs, query } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

const MAX_MEMORIES = 200;   // per-user memory cap
const MAX_PHOTO_MB = 5;     // max photo size in MB
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Moments");
  const router = useRouter();

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Start camera on load + when flipping
  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      // Stop previous stream
      stream?.getTracks().forEach(track => track.stop());

      // STEP 1 — Force permission so labels become available
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());

      // STEP 2 — Get devices with labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === "videoinput");

      let selectedDevice;

      if (facingMode === "environment") {
        // Try to find rear camera
        selectedDevice = videoDevices.find(d =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
        );

        // Fallback if label detection fails
        if (!selectedDevice && videoDevices.length > 1) {
          selectedDevice = videoDevices[1];
        }
      } else {
        // Front camera
        selectedDevice = videoDevices[0];
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: selectedDevice?.deviceId
          ? { deviceId: { exact: selectedDevice.deviceId } }
          : { facingMode },
      });

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video play failed:", playErr);
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      alert("Camera access failed — check permissions");
    }
  };

  const takePhoto = () => {
    const canvas = document.createElement("canvas");
    const video = videoRef.current;

    if (!video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);

    const image = canvas.toDataURL("image/png");
    setPhoto(image);

    // Stop camera after capture
    stream?.getTracks().forEach(track => track.stop());
  };

  const savePhoto = async () => {
    if (!photo || !auth.currentUser) return;

    const uid = auth.currentUser.uid;

    try {
      // Check photo size (base64 is ~4/3 the binary size)
      const base64Data = photo.split(",")[1] || photo;
      const sizeBytes = (base64Data.length * 3) / 4;
      const sizeMB = sizeBytes / (1024 * 1024);
      if (sizeMB > MAX_PHOTO_MB) {
        alert(`Photo is too large (${sizeMB.toFixed(1)} MB). Maximum size is ${MAX_PHOTO_MB} MB.`);
        return;
      }

      // Check per-user memory cap
      const memoriesSnap = await getDocs(query(collection(db, "users", uid, "memories")));
      if (memoriesSnap.size >= MAX_MEMORIES) {
        alert(`You've reached the maximum of ${MAX_MEMORIES} saved memories. Please delete some before adding more.`);
        return;
      }

      const caption = "New memory 📸";

      const storageRef = ref(storage, `memories/${uid}/${Date.now()}.png`);
      await uploadString(storageRef, photo, "data_url");

      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, "users", uid, "memories"), {
        imageUrl: downloadURL,
        caption,
        category: selectedCategory || "Moments",
        createdAt: serverTimestamp(),
      });

      router.push("/");
    } catch (error: any) {
      console.error("FULL ERROR:", error);
      alert(error.message || "Save failed");
    }
  };

  return (
    <div className="relative h-screen bg-black overflow-hidden">

      {/* Back Button */}
      <button
        onClick={() => {
          stream?.getTracks().forEach(track => track.stop());
          router.push("/");
        }}
        className="absolute top-6 left-6 z-50 bg-black/50 text-white px-4 py-2 rounded-lg"
      >
        ← Back
      </button>

      {/* Camera View */}
      {!photo && (
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

          {/* Flip Button */}
          <button
            onClick={() =>
              setFacingMode(prev =>
                prev === "user" ? "environment" : "user"
              )
            }
            className="absolute top-6 right-6 z-50 bg-black/50 text-white px-4 py-2 rounded-lg"
          >
            Flip
          </button>
        </div>
      )}

      {/* Photo Preview */}
      {photo && (
        <img src={photo} className="w-full h-full object-cover" />
      )}

      <div className="absolute bottom-64 left-0 right-0 flex flex-col items-center z-40 px-4">

        {/* Selected Category Label */}
        <div className="text-white text-sm mb-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
          Selected: {selectedCategory}
        </div>

        {/* Category Buttons */}
        <div className="flex gap-2 flex-wrap justify-center bg-black/40 backdrop-blur-md px-3 py-2 rounded-full">
          {["Moments", "People", "Music", "Ideas"].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-white text-black"
                  : "bg-white/20 text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Controls */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-4 z-50">
        {!photo ? (
          <button
            onClick={takePhoto}
            className="w-20 h-20 bg-white/80 backdrop-blur-md rounded-full shadow-xl border border-white/40"
          />
        ) : (
          <>
            <button
              onClick={() => {
                setPhoto(null);
                startCamera();
              }}
              className="bg-gray-200 px-6 py-3 rounded-lg"
            >
              Retake
            </button>

            <button
              onClick={savePhoto}
              className="bg-gradient-to-r from-violet-400 to-orange-400 text-white px-6 py-3 rounded-lg shadow-md"
            >
              Save Photo
            </button>
          </>
        )}
      </div>

    </div>
  );
}
