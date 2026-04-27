"use client";

import { auth, db, storage } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "../../components/BottomNav";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    startCamera();
  }, []);

 const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
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
  };

  const savePhoto = async () => {
  console.log("SAVE CLICKED");

  if (!photo) {
    console.log("NO PHOTO");
    return;
  }

  if (!auth.currentUser) {
    console.log("NO USER");
    return;
  }

  const uid = auth.currentUser.uid;

  try {
    console.log("CALLING AI...");

    const res = await fetch("/api/caption", {
      method: "POST",
       headers: {
    "Content-Type": "application/json",
  },
      body: JSON.stringify({ image: photo }),
    });

    console.log("AI RESPONSE:", res);

    const { caption } = await res.json();
    console.log("CAPTION:", caption);

    console.log("UPLOADING IMAGE...");

    const storageRef = ref(storage, `memories/${uid}/${Date.now()}.png`);
    await uploadString(storageRef, photo, "data_url");

    const downloadURL = await getDownloadURL(storageRef);
    console.log("IMAGE URL:", downloadURL);

    console.log("SAVING TO FIRESTORE...");

    await addDoc(collection(db, "users", uid, "memories"), {
      imageUrl: downloadURL,
      caption,
      createdAt: serverTimestamp(),
    });

    console.log("DONE → REDIRECT");

    router.push("/");
  } catch (error) {
    console.error("ERROR:", error);
    alert("Something failed — check console");
  }
};

  

  return (
    <div className="relative min-h-screen bg-black">

      {/* Camera View */}
      {!photo && (
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Dreamy overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
        </div>
      )}

      {/* Photo Preview */}
      {photo && (
        <img src={photo} className="w-full h-full object-cover" />
      )}

      {/* Capture / Save Button */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center z-50">
        {!photo ? (
          <button
            onClick={takePhoto}
            className="w-20 h-20 bg-white/80 backdrop-blur-md rounded-full shadow-xl border border-white/40"
          />
        ) : (
          <button
  onClick={async () => {
    console.log("BUTTON CLICKED");
    alert("clicked");
    await savePhoto();
  }}
  className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-6 py-3 rounded-lg shadow-md"
>
  Save Photo
</button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}