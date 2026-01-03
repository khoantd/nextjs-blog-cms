import { StockAnalysisUpload } from "@/components/stock-analysis-upload";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CreateStockAnalysisPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/stock-analyses">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
        </Link>
      </div>
      <StockAnalysisUpload />
    </div>
  );
}
