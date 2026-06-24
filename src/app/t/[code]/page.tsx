"use client";

import { useParams } from "next/navigation";
import { TripView } from "@/features/trip/TripApp";

export default function TripCodePage() {
  const params = useParams();
  const code = String(params.code ?? "");
  return <TripView code={code} />;
}
