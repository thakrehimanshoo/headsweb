// "use client";

// import React, { useState, useMemo, useEffect } from "react";
// import { Bell, Building2, Calendar, Filter, X, Briefcase } from "lucide-react";

// /* ---------------- Types ---------------- */
// type Notice = {
//   id: string;
//   type: string;
//   category: string;
//   company: string;
//   notice_text: string;
//   notice_by: string;
//   notice_time: string;
// };

// type NoticesData = {
//   scraped_at: string | null;
//   total_notices: number;
//   notices: Notice[];
// };

// /* --------------- UI Pieces --------------- */
// type CategoryBadgeProps = { category: string };
// const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
//   const isUrgent = category === "Urgent";
  
//   return (
//     <span className={`text-xs px-3 py-1 rounded font-bold tracking-wide uppercase ${
//       isUrgent 
//         ? "bg-[#FFD644] text-[#0D0D0D]" 
//         : "bg-[#1A1A1A] text-[#F4F4F4] border border-[#2A2A2A]"
//     }`}>
//       {category}
//     </span>
//   );
// };

// type NoticeCardProps = { notice: Notice };
// const NoticeCard: React.FC<NoticeCardProps> = ({ notice }) => {
//   const isUrgent = notice.category === "Urgent";

//   // Format date in user-friendly way
//   const formatDate = (dateStr: string) => {
//     try {
//       // Parse the date string (format: DD-MM-YYYY HH:mm)
//       const [datePart, timePart] = dateStr.split(' ');
//       const [day, month, year] = datePart.split('-');
//       const [hours, minutes] = timePart.split(':');
      
//       const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
//       const now = new Date();
//       const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//       const yesterday = new Date(today);
//       yesterday.setDate(yesterday.getDate() - 1);
//       const noticeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
//       let dayStr = '';
//       if (noticeDate.getTime() === today.getTime()) {
//         dayStr = 'Today';
//       } else if (noticeDate.getTime() === yesterday.getTime()) {
//         dayStr = 'Yesterday';
//       } else {
//         dayStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//       }
      
//       const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      
//       return `${dayStr}, ${timeStr}`;
//     } catch (e) {
//       return dateStr;
//     }
//   };

//   return (
//     <div className={`bg-[#0D0D0D] border rounded-lg p-4 transition-all duration-300 hover:border-[#FFD644] hover:shadow-[0_0_20px_rgba(255,214,68,0.15)] group ${
//       isUrgent ? "border-[#FFD644]" : "border-[#2A2A2A]"
//     }`}>
//       <div className="flex items-start justify-between gap-3 mb-3">
//         <div className="flex items-center gap-2 flex-1 min-w-0">
//           <Building2 className={`w-5 h-5 flex-shrink-0 ${isUrgent ? "text-[#FFD644]" : "text-[#F4F4F4]"}`} />
//           <h3 className="font-bold text-base text-[#F4F4F4] break-words tracking-tight">
//             {notice.company || 'General Notice'}
//           </h3>
//         </div>
//         {isUrgent && (
//           <div className="w-2.5 h-2.5 bg-[#FFD644] rounded-full flex-shrink-0 animate-pulse shadow-[0_0_10px_rgba(255,214,68,0.8)] mt-1"></div>
//         )}
//       </div>

//       <div className="flex items-center gap-2 mb-3">
//         <Briefcase className="w-4 h-4 text-[#999999] flex-shrink-0" />
//         <span className="text-sm text-[#CCCCCC] font-medium break-words">{notice.type}</span>
//       </div>

//       <div className="flex flex-col gap-2">
//         <CategoryBadge category={notice.category} />
//         <div className="flex items-center gap-1.5 text-xs text-[#F4F4F4] font-medium bg-[#1A1A1A] px-2.5 py-1.5 rounded w-fit">
//           <Calendar className="w-3.5 h-3.5" />
//           <span className="whitespace-nowrap">{formatDate(notice.notice_time)}</span>
//         </div>
//       </div>
//     </div>
//   );
// };

// /* ---------------- Main Component ---------------- */
// export default function HeadsUp() {
//   const [data, setData] = useState<NoticesData>({
//     scraped_at: null,
//     total_notices: 0,
//     notices: [],
//   });
//   const [searchQuery, setSearchQuery] = useState<string>("");
//   const [selectedCategory, setSelectedCategory] = useState<string>("All");
//   const [selectedType, setSelectedType] = useState<string>("All");
//   const [currentPage, setCurrentPage] = useState<number>(1);
//   const [showFilters, setShowFilters] = useState<boolean>(false);
//   const noticesPerPage = 9;

//   useEffect(() => {
//     let cancelled = false;
    
//     const load = async () => {
//       try {
//         const res = await fetch("/api/notices", { cache: "no-store" });
//         const json = (await res.json()) as NoticesData;
//         if (!cancelled) setData(json);
//       } catch (error) {
//         console.error("Failed to load notices:", error);
//       }
//     };
    
//     load();

//     const es = new EventSource("/api/notices/stream");
    
//     es.addEventListener("update", async () => {
//       try {
//         const res = await fetch("/api/notices", { cache: "no-store" });
//         const json = (await res.json()) as NoticesData;
//         if (!cancelled) setData(json);
//       } catch (error) {
//         console.error("Failed to update notices:", error);
//       }
//     });
    
//     es.onerror = () => {};

//     return () => {
//       cancelled = true;
//       es.close();
//     };
//   }, []);

//   const categories = useMemo<string[]>(() => {
//     const cats = new Set<string>(["All"]);
//     data.notices.forEach((notice) => cats.add(notice.category));
//     return Array.from(cats);
//   }, [data.notices]);

//   const types = useMemo<string[]>(() => {
//     const typeSet = new Set<string>(["All"]);
//     data.notices.forEach((notice) => typeSet.add(notice.type));
//     return Array.from(typeSet);
//   }, [data.notices]);

//   const filteredNotices = useMemo<Notice[]>(() => {
//     const q = searchQuery.toLowerCase();
//     return data.notices.filter((notice) => {
//       const matchesSearch =
//         (notice.company || "").toLowerCase().includes(q) ||
//         (notice.type || "").toLowerCase().includes(q);
//       const matchesCategory = selectedCategory === "All" || notice.category === selectedCategory;
//       const matchesType = selectedType === "All" || notice.type === selectedType;
//       return matchesSearch && matchesCategory && matchesType;
//     });
//   }, [searchQuery, selectedCategory, selectedType, data.notices]);

//   const totalPages = Math.ceil(filteredNotices.length / noticesPerPage);
//   const startIndex = (currentPage - 1) * noticesPerPage;
//   const endIndex = startIndex + noticesPerPage;
//   const currentNotices = filteredNotices.slice(startIndex, endIndex);

//   const urgentCount = useMemo(() => {
//     return filteredNotices.filter(n => n.category === "Urgent").length;
//   }, [filteredNotices]);

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchQuery, selectedCategory, selectedType]);

//   const activeFiltersCount = (selectedType !== "All" ? 1 : 0) + (selectedCategory !== "All" ? 1 : 0);

//   return (
//     <div className="h-screen flex flex-col bg-[#0D0D0D] text-[#F4F4F4] overflow-hidden">
//       {/* Hero Section */}
//       <header className="border-b border-[#1A1A1A] flex-shrink-0">
//         <div className="max-w-7xl mx-auto px-6 py-6">
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <h1 className="text-4xl font-black tracking-tight mb-1">
//                 HeadsUp<span className="text-[#FFD644] animate-pulse drop-shadow-[0_0_15px_rgba(255,214,68,0.8)]">!</span>
//               </h1>
//               <p className="text-[#999999] text-xs tracking-wide">No hassle. Just the heads-up.</p>
//             </div>
//             <div className="flex items-center gap-2 bg-[#1A1A1A] px-3 py-1.5 rounded-full border border-[#2A2A2A]">
//               <div className="w-2 h-2 bg-[#FFD644] rounded-full animate-pulse shadow-[0_0_10px_rgba(255,214,68,0.8)]"></div>
//               <span className="text-xs font-bold tracking-wide uppercase">Live</span>
//             </div>
//           </div>

//           {/* Stats Bar */}
//           <div className="flex items-center gap-4 text-sm">
//             <div>
//               <span className="text-[#999999]">Total:</span>
//               <span className="ml-2 font-bold text-[#F4F4F4]">{filteredNotices.length}</span>
//             </div>
//             <div className="w-px h-4 bg-[#2A2A2A]"></div>
//             <div>
//               <span className="text-[#999999]">Urgent:</span>
//               <span className="ml-2 font-bold text-[#FFD644]">{urgentCount}</span>
//             </div>
//             <div className="w-px h-4 bg-[#2A2A2A]"></div>
//             <div>
//               <span className="text-[#999999]">Updated:</span>
//               <span className="ml-2 font-mono text-xs text-[#CCCCCC]">
//                 {data.scraped_at ? new Date(data.scraped_at).toLocaleString('en-US', { 
//                   month: 'short', 
//                   day: 'numeric', 
//                   hour: '2-digit', 
//                   minute: '2-digit' 
//                 }) : "—"}
//               </span>
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="flex-1 overflow-hidden flex flex-col max-w-7xl mx-auto w-full px-6">
//         {/* Search and Filter */}
//         <div className="py-4 space-y-3 flex-shrink-0">
//           <div className="flex gap-3">
//             <div className="relative flex-1">
//               <input
//                 type="text"
//                 placeholder="Search companies or roles..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:outline-none focus:border-[#FFD644] text-sm text-[#F4F4F4] placeholder-[#666666] transition-colors"
//               />
//               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]">
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//                 </svg>
//               </div>
//             </div>
//             <button
//               onClick={() => setShowFilters(!showFilters)}
//               className="relative px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-[#F4F4F4] rounded-lg hover:border-[#FFD644] transition-colors flex items-center gap-2 font-bold text-sm"
//             >
//               <Filter className="w-4 h-4" />
//               <span className="hidden sm:inline">Filters</span>
//               {activeFiltersCount > 0 && (
//                 <span className="absolute -top-1 -right-1 bg-[#FFD644] text-[#0D0D0D] text-xs w-5 h-5 rounded-full flex items-center justify-center font-black">
//                   {activeFiltersCount}
//                 </span>
//               )}
//             </button>
//           </div>

//           {/* Collapsible Filters */}
//           {showFilters && (
//             <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 space-y-4">
//               <div className="flex items-center justify-between">
//                 <h3 className="text-xs font-black uppercase tracking-wide">Filters</h3>
//                 <button
//                   onClick={() => setShowFilters(false)}
//                   className="text-[#666666] hover:text-[#F4F4F4]"
//                 >
//                   <X className="w-4 h-4" />
//                 </button>
//               </div>

//               <div>
//                 <p className="text-xs font-black text-[#999999] mb-2 uppercase tracking-wider">Type</p>
//                 <div className="flex flex-wrap gap-2">
//                   {types.map((type) => (
//                     <button
//                       key={type}
//                       onClick={() => setSelectedType(type)}
//                       className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
//                         selectedType === type
//                           ? "bg-[#FFD644] text-[#0D0D0D]"
//                           : "bg-[#0D0D0D] text-[#999999] border border-[#2A2A2A] hover:border-[#FFD644]"
//                       }`}
//                     >
//                       {type}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               <div>
//                 <p className="text-xs font-black text-[#999999] mb-2 uppercase tracking-wider">Category</p>
//                 <div className="flex flex-wrap gap-2">
//                   {categories.map((category) => (
//                     <button
//                       key={category}
//                       onClick={() => setSelectedCategory(category)}
//                       className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
//                         selectedCategory === category
//                           ? "bg-[#FFD644] text-[#0D0D0D]"
//                           : "bg-[#0D0D0D] text-[#999999] border border-[#2A2A2A] hover:border-[#FFD644]"
//                       }`}
//                     >
//                       {category}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {activeFiltersCount > 0 && (
//                 <button
//                   onClick={() => {
//                     setSelectedType("All");
//                     setSelectedCategory("All");
//                   }}
//                   className="w-full px-3 py-2 bg-[#0D0D0D] text-[#999999] border border-[#2A2A2A] rounded text-xs font-bold hover:border-[#FFD644] transition-colors"
//                 >
//                   Clear All
//                 </button>
//               )}
//             </div>
//           )}

//           {/* Active Filters Display */}
//           {activeFiltersCount > 0 && !showFilters && (
//             <div className="flex flex-wrap gap-2 items-center">
//               <span className="text-xs text-[#666666] font-bold uppercase tracking-wide">Active:</span>
//               {selectedType !== "All" && (
//                 <span className="bg-[#FFD644] text-[#0D0D0D] text-xs px-2 py-1 rounded flex items-center gap-1.5 font-bold">
//                   {selectedType}
//                   <button onClick={() => setSelectedType("All")}>
//                     <X className="w-3 h-3" />
//                   </button>
//                 </span>
//               )}
//               {selectedCategory !== "All" && (
//                 <span className="bg-[#FFD644] text-[#0D0D0D] text-xs px-2 py-1 rounded flex items-center gap-1.5 font-bold">
//                   {selectedCategory}
//                   <button onClick={() => setSelectedCategory("All")}>
//                     <X className="w-3 h-3" />
//                   </button>
//                 </span>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Feed Section - Scrollable */}
//         <div className="flex-1 overflow-y-auto pr-2">
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-3">
//             {currentNotices.length > 0 ? (
//               currentNotices.map((notice) => (
//                 <NoticeCard key={notice.id} notice={notice} />
//               ))
//             ) : (
//               <div className="col-span-full text-center py-12 border border-[#2A2A2A] rounded-lg">
//                 <Bell className="w-10 h-10 text-[#2A2A2A] mx-auto mb-2" />
//                 <p className="text-[#666666] text-xs font-bold">No notices match your filters</p>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Pagination */}
//         {totalPages > 1 && (
//           <div className="flex items-center justify-center gap-2 py-3 flex-shrink-0">
//             <button
//               onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
//               disabled={currentPage === 1}
//               className="px-3 py-1.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#F4F4F4] hover:border-[#FFD644] disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs transition-colors"
//             >
//               Prev
//             </button>
            
//             <div className="flex items-center gap-1.5">
//               {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
//                 const showPage =
//                   page === 1 ||
//                   page === totalPages ||
//                   (page >= currentPage - 1 && page <= currentPage + 1);
                
//                 const showEllipsis =
//                   (page === currentPage - 2 && currentPage > 3) ||
//                   (page === currentPage + 2 && currentPage < totalPages - 2);

//                 if (showEllipsis) {
//                   return (
//                     <span key={page} className="px-1 text-[#666666] text-xs">
//                       ...
//                     </span>
//                   );
//                 }

//                 if (!showPage) return null;

//                 return (
//                   <button
//                     key={page}
//                     onClick={() => setCurrentPage(page)}
//                     className={`px-3 py-1.5 rounded font-bold text-xs transition-colors ${
//                       currentPage === page
//                         ? "bg-[#FFD644] text-[#0D0D0D]"
//                         : "bg-[#1A1A1A] border border-[#2A2A2A] text-[#F4F4F4] hover:border-[#FFD644]"
//                     }`}
//                   >
//                     {page}
//                   </button>
//                 );
//               })}
//             </div>

//             <button
//               onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
//               disabled={currentPage === totalPages}
//               className="px-3 py-1.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#F4F4F4] hover:border-[#FFD644] disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs transition-colors"
//             >
//               Next
//             </button>
//           </div>
//         )}
//       </main>

//       {/* Footer */}
//       <footer className="border-t border-[#1A1A1A] py-4 flex-shrink-0 bg-[#0D0D0D]">
//         <div className="max-w-7xl mx-auto px-6 text-center">
//           <p className="text-xs text-[#999999]">
//             Made with <span className="text-[#FFD644]">❤</span> by{" "}
//             <span className="font-semibold text-[#F4F4F4]">himanshoo</span>
//           </p>
//         </div>
//       </footer>
//     </div>
//   );
// }
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Bell, Building2, Calendar, Filter, X, Briefcase } from "lucide-react";
import NotificationButton from "@/app/components/NotificationButton";

/* ---------------- Types ---------------- */
type Notice = {
  id: string;
  type: string;
  category: string;
  company: string;
  notice_text: string;
  notice_by: string;
  notice_time: string;
};

type NoticesData = {
  scraped_at: string | null;
  total_notices: number;
  notices: Notice[];
};

/* --------------- UI Pieces --------------- */
type CategoryBadgeProps = { category: string };
const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const isUrgent = category === "Urgent";
  
  return (
    <span className={`text-xs px-3 py-1 rounded font-bold tracking-wide uppercase ${
      isUrgent 
        ? "bg-[#FFD644] text-[#0D0D0D]" 
        : "bg-[#1A1A1A] text-[#F4F4F4] border border-[#2A2A2A]"
    }`}>
      {category}
    </span>
  );
};

type NoticeCardProps = { notice: Notice; isNew?: boolean };
const NoticeCard: React.FC<NoticeCardProps> = ({ notice, isNew = false }) => {
  const isUrgent = notice.category === "Urgent";

  // Format date in user-friendly way
  const formatDate = (dateStr: string) => {
    try {
      // Parse the date string (format: DD-MM-YYYY HH:mm)
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('-');
      const [hours, minutes] = timePart.split(':');
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const noticeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      let dayStr = '';
      if (noticeDate.getTime() === today.getTime()) {
        dayStr = 'Today';
      } else if (noticeDate.getTime() === yesterday.getTime()) {
        dayStr = 'Yesterday';
      } else {
        dayStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      
      return `${dayStr}, ${timeStr}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className={`bg-[#0D0D0D] border rounded-lg p-4 transition-all duration-300 hover:border-[#FFD644] hover:shadow-[0_0_20px_rgba(255,214,68,0.15)] group ${
      isNew
        ? "border-[#3B82F6] shadow-[0_0_25px_rgba(59,130,246,0.3)] animate-[pulse_2s_ease-in-out_3]"
        : isUrgent
        ? "border-[#FFD644]"
        : "border-[#2A2A2A]"
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isNew && (
            <div className="px-2 py-0.5 bg-[#3B82F6] text-[#FFFFFF] text-[10px] font-bold rounded uppercase tracking-wide flex-shrink-0">
              NEW
            </div>
          )}
          <Building2 className={`w-5 h-5 flex-shrink-0 ${isNew ? "text-[#3B82F6]" : isUrgent ? "text-[#FFD644]" : "text-[#F4F4F4]"}`} />
          <h3 className="font-bold text-base text-[#F4F4F4] break-words tracking-tight">
            {notice.company || 'General Notice'}
          </h3>
        </div>
        {isUrgent && (
          <div className="w-2.5 h-2.5 bg-[#FFD644] rounded-full flex-shrink-0 animate-pulse shadow-[0_0_10px_rgba(255,214,68,0.8)] mt-1"></div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-4 h-4 text-[#999999] flex-shrink-0" />
        <span className="text-sm text-[#CCCCCC] font-medium break-words">{notice.type}</span>
      </div>

      <div className="flex flex-col gap-2">
        <CategoryBadge category={notice.category} />
        <div className="flex items-center gap-1.5 text-xs text-[#F4F4F4] font-medium bg-[#1A1A1A] px-2.5 py-1.5 rounded w-fit">
          <Calendar className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{formatDate(notice.notice_time)}</span>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Main Component ---------------- */
export default function HeadsUp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [data, setData] = useState<NoticesData>({
    scraped_at: null,
    total_notices: 0,
    notices: [],
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [newNoticeIds, setNewNoticeIds] = useState<Set<string>>(new Set());
  const noticesPerPage = 9;

  // Redirect to / if /placement accessed directly (not from notification)
  useEffect(() => {
    const fromNotification = searchParams.get('from');
    const newIds = searchParams.get('new');

    // Only enforce redirect on /placement page, not on homepage
    if (pathname === '/placement') {
      if (!fromNotification || fromNotification !== 'notification') {
        // Not from notification, redirect to homepage
        router.replace('/');
        return;
      }
    }

    // From notification - extract new notice IDs for highlighting
    if (fromNotification === 'notification' && newIds) {
      const ids = newIds.split(',').filter(Boolean);
      setNewNoticeIds(new Set(ids));
      console.log('Highlighting new notices:', ids);

      // Clear highlight after 10 seconds
      const timeout = setTimeout(() => {
        setNewNoticeIds(new Set());
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [searchParams, router, pathname]);

  // ============ CHANGED: Replaced SSE with Polling ============
  useEffect(() => {
    let cancelled = false;
    
    const load = async () => {
      try {
        const res = await fetch("/api/notices", { cache: "no-store" });
        const json = (await res.json()) as NoticesData;
        if (!cancelled) setData(json);
      } catch (error) {
        console.error("Failed to load notices:", error);
      }
    };
    
    // Initial load
    load();

    // Poll every 5 seconds instead of SSE
    const intervalId = setInterval(load, 60000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);
  // ============ END OF CHANGES ============

  const categories = useMemo<string[]>(() => {
    const cats = new Set<string>(["All"]);
    data.notices.forEach((notice) => cats.add(notice.category));
    return Array.from(cats);
  }, [data.notices]);

  const types = useMemo<string[]>(() => {
    const typeSet = new Set<string>(["All"]);
    data.notices.forEach((notice) => typeSet.add(notice.type));
    return Array.from(typeSet);
  }, [data.notices]);

  const filteredNotices = useMemo<Notice[]>(() => {
    const q = searchQuery.toLowerCase();
    return data.notices.filter((notice) => {
      const matchesSearch =
        (notice.company || "").toLowerCase().includes(q) ||
        (notice.type || "").toLowerCase().includes(q);
      const matchesCategory = selectedCategory === "All" || notice.category === selectedCategory;
      const matchesType = selectedType === "All" || notice.type === selectedType;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [searchQuery, selectedCategory, selectedType, data.notices]);

  const totalPages = Math.ceil(filteredNotices.length / noticesPerPage);
  const startIndex = (currentPage - 1) * noticesPerPage;
  const endIndex = startIndex + noticesPerPage;
  const currentNotices = filteredNotices.slice(startIndex, endIndex);

  const urgentCount = useMemo(() => {
    return filteredNotices.filter(n => n.category === "Urgent").length;
  }, [filteredNotices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedType]);

  const activeFiltersCount = (selectedType !== "All" ? 1 : 0) + (selectedCategory !== "All" ? 1 : 0);

  return (
    <div className="h-screen flex flex-col bg-[#0D0D0D] text-[#F4F4F4] overflow-hidden">
      {/* Hero Section */}
      <header className="border-b border-[#1A1A1A] flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-1">
                HeadsUp<span className="text-[#FFD644] animate-pulse drop-shadow-[0_0_15px_rgba(255,214,68,0.8)]">!</span>
              </h1>
              <p className="text-[#999999] text-xs tracking-wide">No hassle. Just the heads-up.</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationButton />
              <div className="flex items-center gap-2 bg-[#1A1A1A] px-3 py-1.5 rounded-full border border-[#2A2A2A]">
                <div className="w-2 h-2 bg-[#FFD644] rounded-full animate-pulse shadow-[0_0_10px_rgba(255,214,68,0.8)]"></div>
                <span className="text-xs font-bold tracking-wide uppercase">Live</span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-[#999999]">Total:</span>
              <span className="ml-2 font-bold text-[#F4F4F4]">{filteredNotices.length}</span>
            </div>
            <div className="w-px h-4 bg-[#2A2A2A]"></div>
            <div>
              <span className="text-[#999999]">Urgent:</span>
              <span className="ml-2 font-bold text-[#FFD644]">{urgentCount}</span>
            </div>
            <div className="w-px h-4 bg-[#2A2A2A]"></div>
            <div>
              <span className="text-[#999999]">Updated:</span>
              <span className="ml-2 font-mono text-xs text-[#CCCCCC]">
                {data.scraped_at ? new Date(data.scraped_at).toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : "—"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-7xl mx-auto w-full px-6">
        {/* Search and Filter */}
        <div className="py-4 space-y-3 flex-shrink-0">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search companies or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:outline-none focus:border-[#FFD644] text-sm text-[#F4F4F4] placeholder-[#666666] transition-colors"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="relative px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-[#F4F4F4] rounded-lg hover:border-[#FFD644] transition-colors flex items-center gap-2 font-bold text-sm"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FFD644] text-[#0D0D0D] text-xs w-5 h-5 rounded-full flex items-center justify-center font-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wide">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-[#666666] hover:text-[#F4F4F4]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs font-black text-[#999999] mb-2 uppercase tracking-wider">Type</p>
                <div className="flex flex-wrap gap-2">
                  {types.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        selectedType === type
                          ? "bg-[#FFD644] text-[#0D0D0D]"
                          : "bg-[#0D0D0D] text-[#999999] border border-[#2A2A2A] hover:border-[#FFD644]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-[#999999] mb-2 uppercase tracking-wider">Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        selectedCategory === category
                          ? "bg-[#FFD644] text-[#0D0D0D]"
                          : "bg-[#0D0D0D] text-[#999999] border border-[#2A2A2A] hover:border-[#FFD644]"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    setSelectedType("All");
                    setSelectedCategory("All");
                  }}
                  className="w-full px-3 py-2 bg-[#0D0D0D] text-[#999999] border border-[#2A2A2A] rounded text-xs font-bold hover:border-[#FFD644] transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          )}

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && !showFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-[#666666] font-bold uppercase tracking-wide">Active:</span>
              {selectedType !== "All" && (
                <span className="bg-[#FFD644] text-[#0D0D0D] text-xs px-2 py-1 rounded flex items-center gap-1.5 font-bold">
                  {selectedType}
                  <button onClick={() => setSelectedType("All")}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCategory !== "All" && (
                <span className="bg-[#FFD644] text-[#0D0D0D] text-xs px-2 py-1 rounded flex items-center gap-1.5 font-bold">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory("All")}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Feed Section - Scrollable */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-3">
            {currentNotices.length > 0 ? (
              currentNotices.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  isNew={newNoticeIds.has(notice.id)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 border border-[#2A2A2A] rounded-lg">
                <Bell className="w-10 h-10 text-[#2A2A2A] mx-auto mb-2" />
                <p className="text-[#666666] text-xs font-bold">No notices match your filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-3 flex-shrink-0">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#F4F4F4] hover:border-[#FFD644] disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs transition-colors"
            >
              Prev
            </button>
            
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const showPage =
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);
                
                const showEllipsis =
                  (page === currentPage - 2 && currentPage > 3) ||
                  (page === currentPage + 2 && currentPage < totalPages - 2);

                if (showEllipsis) {
                  return (
                    <span key={page} className="px-1 text-[#666666] text-xs">
                      ...
                    </span>
                  );
                }

                if (!showPage) return null;

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded font-bold text-xs transition-colors ${
                      currentPage === page
                        ? "bg-[#FFD644] text-[#0D0D0D]"
                        : "bg-[#1A1A1A] border border-[#2A2A2A] text-[#F4F4F4] hover:border-[#FFD644]"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#F4F4F4] hover:border-[#FFD644] disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1A] py-4 flex-shrink-0 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs text-[#999999]">
            Made with <span className="text-[#FFD644]">❤</span> by{" "}
            <span className="font-semibold text-[#F4F4F4]">himanshoo</span>
          </p>
        </div>
      </footer>
    </div>
  );
}