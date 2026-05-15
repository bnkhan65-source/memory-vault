"use client";

import { useRouter, usePathname } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();
  const path = usePathname();

 return (
  <div className="fixed bottom-1/3 z-[9999] flex flex-col gap-3 right-4 md:right-[calc((100%-36rem)/2-4rem)]">
    
    <button
      onClick={() => router.push("/")}
      className={`w-12 h-12 rounded-full shadow-md flex items-center justify-center transition hover:scale-110 active:scale-95 ${
        path === "/" ? "bg-blue-500 text-white" : "bg-white text-gray-500"
      }`}
    >
      🏠
    </button>

    <button
      onClick={() => router.push("/camera")}
      className={`w-12 h-12 rounded-full shadow-md flex items-center justify-center transition hover:scale-110 active:scale-95 ${
        path === "/camera" ? "bg-blue-500 text-white" : "bg-white text-gray-500"
      }`}
    >
      📷
    </button>

  </div>
);
}