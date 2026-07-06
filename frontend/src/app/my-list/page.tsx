"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useBookmarks, BookmarkItem } from "@/context/BookmarkContext";
import { SiteNavbar } from "@/components/SiteNavbar";
import { AuthGate } from "@/components/AuthGate";
import { PageTransition } from "@/components/PageTransition";
import { ArrowLeft, Download, GripVertical, Trash2, Bookmark } from "lucide-react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
}

function SortableBookmarkRow({
  bookmark,
  index,
  onRemove,
}: {
  bookmark: BookmarkItem;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-stretch gap-3 border-b border-dashed border-blue-200 bg-white/80 px-4 py-3 shadow-sm transition ${
        isDragging ? "z-20 scale-[1.01] shadow-2xl" : "hover:bg-yellow-50"
      }`}
    >
      <div className="flex w-12 shrink-0 items-center justify-center border-r border-blue-100 pr-3">
        <span className="font-[family-name:var(--font-caveat)] text-3xl font-black text-slate-900">
          {index + 1}
        </span>
      </div>

      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab items-center text-slate-400 active:cursor-grabbing"
        title="Drag to reorder preference"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              Preference {index + 1}
            </div>
            <h2 className="mt-1 truncate font-[family-name:var(--font-caveat)] text-2xl font-black leading-tight text-black">
              {bookmark.college_name}
            </h2>
            <p className="mt-1 truncate text-xs font-semibold text-slate-700">
              {formatValue(bookmark.branch_name)}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 text-[11px] font-bold">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-900 ring-1 ring-blue-200">
              {formatValue(bookmark.cap_round)}
            </span>
            <span className="rounded-full bg-green-50 px-3 py-1 text-green-900 ring-1 ring-green-200">
              {formatValue(bookmark.seat_type)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-900 ring-1 ring-slate-300">
              {formatValue(bookmark.quota_allocation)}
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-4">
          <div>
            <span className="font-black text-slate-500">Choice</span>
            <div className="font-mono text-slate-900">{formatValue(bookmark.choice_code)}</div>
          </div>
          <div>
            <span className="font-black text-slate-500">College Code</span>
            <div className="font-mono text-slate-900">{formatValue(bookmark.college_code)}</div>
          </div>
          <div>
            <span className="font-black text-slate-500">Rank</span>
            <div className="font-semibold text-slate-900">{formatValue(bookmark.cutoff_rank)}</div>
          </div>
          <div>
            <span className="font-black text-slate-500">Percentile</span>
            <div className="font-semibold text-slate-900">{formatValue(bookmark.cutoff_percentile)}%</div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(bookmark.id)}
        className="self-center rounded-full border border-red-200 bg-red-50 p-2 text-red-700 opacity-80 transition hover:bg-red-100 hover:opacity-100"
        title="Remove from list"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function MyListPage() {
  const { bookmarks, removeBookmark, reorderBookmarks, loading } = useBookmarks();
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const bookmarkIds = useMemo(() => bookmarks.map((bookmark) => bookmark.id), [bookmarks]);

  const goToPredictor = () => {
    router.push("/?view=predictor");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = bookmarks.findIndex((bookmark) => bookmark.id === active.id);
    const newIndex = bookmarks.findIndex((bookmark) => bookmark.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    void reorderBookmarks(arrayMove(bookmarks, oldIndex, newIndex));
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedOn = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const tableBody = bookmarks.map((bookmark, index) => [
      String(index + 1),
      formatValue(bookmark.college_name),
      formatValue(bookmark.branch_name),
      formatValue(bookmark.category ?? bookmark.seat_type),
      formatValue(bookmark.quota_allocation),
      formatValue(bookmark.cap_round),
      `Rank: ${formatValue(bookmark.cutoff_rank)}\nPercentile: ${formatValue(bookmark.cutoff_percentile)}%`,
    ]);

    const drawBranding = () => {
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(14, 12, 16, 16, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("CP", 18.1, 22.3);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(18);
      doc.text("ClgPredict", 34, 19);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("MHT-CET College Predictor - Preference List", 34, 25);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 64, 175);
      doc.text(`Saved colleges: ${bookmarks.length}`, pageWidth - 14, 18, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${generatedOn}`, pageWidth - 14, 24, { align: "right" });

      doc.setDrawColor(191, 219, 254);
      doc.line(14, 34, pageWidth - 14, 34);
    };

    const drawFooter = (pageNumber: number) => {
      doc.setTextColor(226, 232, 240);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("ClgPredict", pageWidth - 14, pageHeight - 12, { align: "right" });

      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Page ${pageNumber}`, 14, pageHeight - 10);
      doc.text("Generated from clgpredict.com", pageWidth / 2, pageHeight - 10, { align: "center" });
    };

    autoTable(doc, {
      head: [[
        "Pref No.",
        "College Name",
        "Branch",
        "Category",
        "Quota",
        "CAP Round",
        "Cutoff",
      ]],
      body: tableBody,
      startY: 42,
      margin: { top: 42, right: 12, bottom: 22, left: 12 },
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.4,
        lineColor: [219, 234, 254],
        lineWidth: 0.25,
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 14, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 44 },
        2: { cellWidth: 35 },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 24 },
        5: { cellWidth: 22, halign: "center" },
        6: { cellWidth: 31 },
      },
      didDrawPage: (data) => {
        drawBranding();
        drawFooter(data.pageNumber);
      },
    });

    doc.save("clgpredict-preference-list.pdf");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900">
      <SiteNavbar variant="subpage" onOpenPredictor={goToPredictor} />
      <AuthGate
        title="Sign in to view your list"
        description="Your saved colleges stay linked to your account. Sign in or create a free account to open your preference diary."
      >
        <PageTransition className="px-4 pb-10 pt-[97px]">
          <main className="relative mx-auto max-w-6xl overflow-visible rounded-lg border border-slate-300 bg-white/95 pl-8 shadow-2xl shadow-slate-900/10 md:pl-14">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-14 border-r border-blue-100 bg-blue-50/60 md:block">
          {Array.from({ length: 14 }).map((_, index) => (
            <div
              key={index}
              className="absolute left-1/2 flex h-10 w-16 -translate-x-1/2 items-center"
              style={{ top: `${7 + index * 6.6}%` }}
            >
              <span className="h-7 w-7 rounded-full border-2 border-slate-300 bg-[#f6f1e8] shadow-inner" />
              <span className="-ml-3 h-6 w-12 rounded-full border-[3px] border-slate-500 border-l-transparent bg-transparent shadow-sm" />
            </div>
          ))}
        </div>

        <header className="flex flex-col gap-4 border-b-2 border-dashed border-blue-200 bg-yellow-50 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-900 ring-1 ring-blue-200">
              <Bookmark className="h-4 w-4" /> Saved Preference Diary
            </div>
            <h1 className="mt-3 font-[family-name:var(--font-caveat)] text-5xl font-black leading-none text-black">
              My College List
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goToPredictor}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Predictor
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={bookmarks.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> Export PDF
            </button>
          </div>
        </header>

        <section className="relative min-h-[620px] bg-[linear-gradient(#ffffff_31px,#dbeafe_32px)] bg-[length:100%_32px] px-4 py-6 md:px-8">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded bg-white/80 shadow-sm" />
              ))}
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="mx-auto mt-24 max-w-md rounded-lg border-2 border-dashed border-amber-300 bg-yellow-50 p-8 text-center shadow-lg">
              <h2 className="font-[family-name:var(--font-caveat)] text-4xl font-black text-black">
                Nothing saved yet
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Bookmark colleges from predictor and they will appear here as preference strips.
              </p>
              <button
                type="button"
                onClick={goToPredictor}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
              >
                Open Predictor
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={bookmarkIds} strategy={verticalListSortingStrategy}>
                <div className="overflow-hidden rounded-lg border border-blue-200 bg-white/70">
                  {bookmarks.map((bookmark, index) => (
                    <SortableBookmarkRow
                      key={bookmark.id}
                      bookmark={bookmark}
                      index={index}
                      onRemove={removeBookmark}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
          </main>
        </PageTransition>
      </AuthGate>
    </div>
  );
}
