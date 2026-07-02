"use client";

import React, { useEffect } from "react";
import { useBookmarks, BookmarkItem } from "@/context/BookmarkContext";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, GripVertical, FileDown, ArrowLeft, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function SortableItem({ item, onRemove }: { item: BookmarkItem, onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-900 border ${isDragging ? 'border-indigo-500 shadow-xl shadow-indigo-500/20' : 'border-slate-800'} rounded-xl p-4 flex items-center gap-4 mb-3`}
    >
      <div {...attributes} {...listeners} className="cursor-grab hover:text-indigo-400 text-slate-500 p-2">
        <GripVertical className="h-5 w-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-slate-100 truncate">{item.college_name}</h4>
        <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span>{item.branch_name}</span>
          <span className="text-indigo-400 font-semibold">{item.seat_type}</span>
          <span className="text-amber-400 font-semibold">{item.cutoff_percentile}%</span>
        </div>
      </div>
      
      <button
        onClick={() => onRemove(item.id)}
        className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
        title="Remove"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function MyList() {
  const { bookmarks, reorderBookmarks, removeBookmark, loading } = useBookmarks();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = bookmarks.findIndex((i) => i.id === active.id);
      const newIndex = bookmarks.findIndex((i) => i.id === over.id);
      const newOrder = arrayMove(bookmarks, oldIndex, newIndex);
      reorderBookmarks(newOrder);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text("ClgPredict", 40, 50);
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text("My Personalized College Preferences", 40, 75);
    
    const tableData = bookmarks.map((b, index) => [
      index + 1,
      b.college_name,
      b.branch_name,
      b.seat_type,
      b.cap_round,
      `${b.cutoff_percentile}%`,
    ]);

    autoTable(doc, {
      startY: 100,
      head: [["#", "College Name", "Branch", "Category", "CAP Round", "Cutoff"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 280 },
        2: { cellWidth: 200 },
        3: { cellWidth: 70 },
        4: { cellWidth: 80 },
        5: { cellWidth: 70 },
      }
    });

    doc.save("ClgPredict_My_Preferences.pdf");
  };

  if (!isLoaded || loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-semibold mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Predictor
            </button>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Building2 className="h-8 w-8 text-indigo-500" /> My College List
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Drag and drop to reorder your preferences.</p>
          </div>
          
          {bookmarks.length > 0 && (
            <button 
              onClick={generatePDF}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
            >
              <FileDown className="h-5 w-5" /> Export PDF
            </button>
          )}
        </header>

        {bookmarks.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center">
            <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-slate-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-2">Your list is empty</h2>
            <p className="text-slate-400 mb-6">Go back to the predictor to find and bookmark colleges.</p>
            <button 
              onClick={() => router.push("/")}
              className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Start Predicting
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={bookmarks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {bookmarks.map((item) => (
                  <SortableItem key={item.id} item={item} onRemove={removeBookmark} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
