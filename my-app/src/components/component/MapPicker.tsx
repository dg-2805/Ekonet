"use client"

import dynamic from "next/dynamic"

const MapPicker = dynamic(() => import("./MapPickerClient"), {
  ssr: false,
})

export default MapPicker
