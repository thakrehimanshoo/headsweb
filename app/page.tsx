import { Suspense } from "react";
import PlacementNoticeboard from "./placement/PlacementNoticeboard";

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#0D0D0D] text-[#F4F4F4]">Loading...</div>}>
      <PlacementNoticeboard />
    </Suspense>
  );
}