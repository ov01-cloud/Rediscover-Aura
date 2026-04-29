import { notFound } from "next/navigation";
import { DataReviewView } from "@/components/data-review-view";

export default function DataReviewPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_DATA_REVIEW !== "true") {
    notFound();
  }
  return <DataReviewView />;
}
