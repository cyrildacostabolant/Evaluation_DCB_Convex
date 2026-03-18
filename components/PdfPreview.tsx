
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Evaluation, Category, Question } from '../types';
import { ArrowLeft, Printer } from 'lucide-react';

interface PdfPreviewProps {
  evaluation: Evaluation;
  category?: Category;
  mode: 'student' | 'teacher';
  onClose: () => void;
}

type PageItemType = 'section' | 'question';

interface PageItem {
  type: PageItemType;
  data: any;
  height: number;
  dottedLinesHeight?: number; 
  points?: number; 
}

interface Page {
  pageNumber: number;
  items: PageItem[];
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ evaluation, category, mode, onClose }) => {
  const categoryColor = category?.color || '#3b82f6';
  const [pages, setPages] = useState<Page[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(true);
  const measureContainerRef = useRef<HTMLDivElement>(null);

  // --- CONSTANTES DE DIMENSIONS ---
  const PAGE_HEIGHT = 1123; // A4 à 96 DPI
  const PAGE_PADDING_PX = 38; // 10mm
  const FOOTER_HEIGHT = 28; // ~7.5mm compact footer
  const HEADER_HEIGHT_P1 = 205; // En-tête page 1 compacté
  
  // Buffer de sécurité minimal
  const SAFETY_BUFFER = 5; 

  const CONTENT_HEIGHT_P1 = PAGE_HEIGHT - (PAGE_PADDING_PX * 2) - HEADER_HEIGHT_P1 - FOOTER_HEIGHT - SAFETY_BUFFER;
  const CONTENT_HEIGHT_PN = PAGE_HEIGHT - (PAGE_PADDING_PX * 2) - FOOTER_HEIGHT - SAFETY_BUFFER;

  const contentStyle = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13pt',
    lineHeight: '1.4'
  };

  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? 'black' : 'white';
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const sections: string[] = Array.from(new Set(evaluation.questions.map(q => q.section_name || 'Autre')));

  const getSectionPoints = (sectionName: string) => {
    return evaluation.questions
      .filter(q => (q.section_name || 'Autre') === sectionName)
      .reduce((acc, curr) => acc + (curr.points || 0), 0);
  };

  useLayoutEffect(() => {
    if (!measureContainerRef.current) return;

    const timer = setTimeout(() => {
      const computedPages: Page[] = [];
      let currentPageItems: PageItem[] = [];
      let currentHeight = 0;
      let pageIndex = 1;
      
      let maxPageHeight = CONTENT_HEIGHT_P1;
      const elements = Array.from(measureContainerRef.current!.children) as HTMLElement[];
      
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const type = el.dataset.type as PageItemType;
        
        let itemHeight = 0;
        let dottedH = 0;
        let itemData: any = null;
        let itemPoints = 0;

        if (type === 'section') {
          itemData = el.dataset.title;
          itemPoints = parseFloat(el.dataset.points || '0');
          itemHeight = el.offsetHeight + 12; // mb-3
        } else {
          const qId = el.dataset.id;
          itemData = evaluation.questions.find(q => q.id === qId);
          itemPoints = parseFloat(el.dataset.points || '0');
          
          // La mesure el.offsetHeight est maintenant fiable car le ghost 
          // affiche le contenu exact correspondant au mode (student/teacher)
          itemHeight = el.offsetHeight + 12; // mb-3

          // On récupère la hauteur des lignes pointillées si elles ont été mesurées
          const dottedEl = el.querySelector('.measure-dotted-area') as HTMLElement;
          if (dottedEl) {
            dottedH = dottedEl.offsetHeight;
          }
        }

        if (currentHeight + itemHeight > maxPageHeight && currentPageItems.length > 0) {
          computedPages.push({ pageNumber: pageIndex, items: currentPageItems });
          pageIndex++;
          currentPageItems = [];
          currentHeight = 0;
          maxPageHeight = CONTENT_HEIGHT_PN;
        }

        // Anti-orphelin pour les titres de section : si c'est une section et que la question suivante ne tient pas,
        // on bascule la section sur la page suivante.
        if (type === 'section' && i + 1 < elements.length) {
          const nextEl = elements[i+1] as HTMLElement;
          const nextHeight = nextEl.offsetHeight + 12;
          if (currentHeight + itemHeight + nextHeight > maxPageHeight && currentPageItems.length > 0) {
            computedPages.push({ pageNumber: pageIndex, items: currentPageItems });
            pageIndex++;
            currentPageItems = [];
            currentHeight = 0;
            maxPageHeight = CONTENT_HEIGHT_PN;
          }
        }

        currentPageItems.push({
          type, data: itemData, height: itemHeight, dottedLinesHeight: dottedH, points: itemPoints
        });
        currentHeight += itemHeight;
      }

      if (currentPageItems.length > 0) {
        computedPages.push({ pageNumber: pageIndex, items: currentPageItems });
      }

      setPages(computedPages);
      setIsMeasuring(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [evaluation, mode]);

  const renderRealQuestion = (q: Question, dottedHeight?: number, points?: number) => {
    const numberOfLines = dottedHeight ? Math.floor(dottedHeight / 30) : 1;
    const correctCount = q.mcq_options?.filter(o => o.is_correct).length || 0;
    const hasMultipleCorrect = correctCount > 1;

    return (
    <div className="mb-3 pl-2 page-item-container">
      <div className="mb-2 text-blue-900 flex justify-between items-start gap-4">
        <div className="measure-question-text flex-grow font-bold" style={contentStyle}>
          {q.question_text}
          {q.is_mcq && hasMultipleCorrect && (
            <span className="ml-2 text-slate-500 font-normal italic text-sm">(Plusieurs réponses possibles)</span>
          )}
        </div>
        {points !== undefined && points > 0 && (
           <div className="font-bold text-slate-400 text-sm whitespace-nowrap pt-1">/ {points}</div>
        )}
      </div>
      <div className="pl-2">
        {q.is_mcq ? (
          <div className="space-y-2 mt-2">
            {(q.mcq_options || []).map((opt, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className={`w-5 h-5 border-2 border-black flex-shrink-0 mt-1 flex items-center justify-center ${mode === 'teacher' && opt.is_correct ? 'bg-black' : ''}`}>
                  {mode === 'teacher' && opt.is_correct && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className={`text-sm ${mode === 'teacher' && opt.is_correct ? 'font-bold' : ''}`} style={contentStyle}>
                  {opt.text}
                </div>
              </div>
            ))}
          </div>
        ) : mode === 'teacher' ? (
          <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-900 editor-content rounded-r-lg"
               style={contentStyle} dangerouslySetInnerHTML={{ __html: q.teacher_answer }} />
        ) : (
          <>
            {q.student_prompt ? (
               <div className="editor-content" style={contentStyle} dangerouslySetInnerHTML={{ __html: q.student_prompt }} />
            ) : (
              <div className="w-full flex flex-col">
                {Array.from({ length: Math.max(1, numberOfLines) }).map((_, i) => (
                  <div key={i} className="w-full border-b border-black" style={{ height: '30px', flexShrink: 0 }}></div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 overflow-y-auto flex flex-col items-center pdf-modal-root">
      
      {/* Ghost measuring container - Doit être le REFLET EXACT du rendu final */}
      <div 
        ref={measureContainerRef} 
        className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none bg-white no-print"
        style={{ width: '210mm', padding: '10mm' }}
      >
        {sections.map(section => {
          const sectionPoints = getSectionPoints(section);
          return (
          <React.Fragment key={section}>
            <div className="mb-3" data-type="section" data-title={section} data-points={sectionPoints}>
               <div className="pb-1 border-b-2 flex justify-between items-end" style={{ borderColor: '#dc2626' }}>
                  <h3 className="font-bold text-lg uppercase tracking-wider" style={{ color: '#dc2626' }}>{section}</h3>
                  <span className="font-bold text-sm mb-1" style={{ color: '#dc2626' }}>({sectionPoints} pts)</span>
                </div>
            </div>
            {evaluation.questions.filter(q => (q.section_name || 'Autre') === section).map(q => {
               // Calcul du nombre de lignes pour le mode élève sans prompt
               const tempDiv = document.createElement('div');
               tempDiv.style.width = '190mm'; // Largeur estimée contenu
               tempDiv.style.fontSize = '13pt';
               tempDiv.style.lineHeight = '1.4';
               tempDiv.innerHTML = q.teacher_answer;
               document.body.appendChild(tempDiv);
               const h = tempDiv.offsetHeight;
               document.body.removeChild(tempDiv);
               
               // On ajoute la ligne supplémentaire (+ 1) comme demandé pour le confort d'écriture
               const lines = Math.max(1, Math.ceil(h / 30) + 1);
               const dottedH = lines * 30;

               return (
                <div key={q.id} data-type="question" data-id={q.id} data-points={q.points}>
                  <div className="mb-3 pl-2">
                    <div className="mb-2 text-blue-900 font-bold measure-question-text" style={contentStyle}>
                      {q.question_text}
                      {q.is_mcq && (q.mcq_options?.filter(o => o.is_correct).length || 0) > 1 && (
                        <span className="ml-2 text-slate-500 font-normal italic text-sm">(Plusieurs réponses possibles)</span>
                      )}
                    </div>
                    <div className="pl-2">
                      {q.is_mcq ? (
                        <div className="space-y-2 mt-2">
                          {(q.mcq_options || []).map((opt, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className={`w-5 h-5 border-2 border-black flex-shrink-0 mt-1 flex items-center justify-center ${mode === 'teacher' && opt.is_correct ? 'bg-black' : ''}`}>
                                {mode === 'teacher' && opt.is_correct && (
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                              <div className={`text-sm ${mode === 'teacher' && opt.is_correct ? 'font-bold' : ''}`} style={contentStyle}>
                                {opt.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : mode === 'teacher' ? (
                        <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-900 editor-content rounded-r-lg"
                             style={contentStyle} dangerouslySetInnerHTML={{ __html: q.teacher_answer }} />
                      ) : (
                        <>
                          {q.student_prompt ? (
                             <div className="editor-content" style={contentStyle} dangerouslySetInnerHTML={{ __html: q.student_prompt }} />
                          ) : (
                            <div className="measure-dotted-area w-full flex flex-col" style={{ height: `${dottedH}px` }}>
                               {/* Espace exact pour les lignes pointillées */}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
               );
            })}
          </React.Fragment>
        )})}
      </div>

      {/* Toolbar */}
      <div className="w-full bg-white p-4 shadow-md sticky top-0 z-[60] flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-600 hover:text-black flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} /> <span className="hidden sm:inline font-bold">Retour</span>
          </button>
          <h2 className="font-black text-lg text-slate-800">
            {isMeasuring ? 'Mise en page...' : mode === 'teacher' ? 'Version Professeur' : 'Version Élève'}
          </h2>
        </div>
        <button
          onClick={handlePrint}
          disabled={isMeasuring}
          className={`bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all ${isMeasuring ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Printer size={18} /> Imprimer
        </button>
      </div>

      {/* Pages Render */}
      <div className="py-8 w-full flex flex-col items-center gap-8 print-wrapper">
        {!isMeasuring && pages.map((page) => (
          <div key={page.pageNumber} className="a4-page bg-white shadow-2xl relative flex flex-col overflow-hidden box-border">
            <div className="flex flex-col h-full box-border relative" style={{ padding: '10mm' }} >
              
              {/* Header P1 */}
              {page.pageNumber === 1 && (
                <div className="mb-4" style={{ height: `${HEADER_HEIGHT_P1}px`, flexShrink: 0 }}>
                  <div className="h-[2cm] flex border-2 border-black mb-[0.5cm] overflow-hidden">
                    <div className="w-[20%] border-r-2 border-black flex flex-col justify-center items-center p-2">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Date</span>
                      <div className="text-gray-300">..../..../....</div>
                    </div>
                    <div className="w-[80%] flex items-center justify-center text-center px-4 font-bold text-xl uppercase tracking-wider"
                      style={{ backgroundColor: categoryColor, color: getContrastColor(categoryColor), printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                      {evaluation.title}
                    </div>
                  </div>
                  <div className="h-[3cm] flex border-2 border-black">
                    <div className="w-[80%] border-r-2 border-black p-2 relative"><span className="text-[10px] text-gray-500 uppercase absolute top-1 left-2 font-bold">Commentaires</span></div>
                    <div className="w-[20%] p-2 relative flex flex-col justify-end items-center"><span className="text-[10px] text-gray-500 uppercase absolute top-1 left-2 font-bold">Note</span><div className="text-3xl font-black text-slate-800">/ 20</div></div>
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex-grow overflow-hidden">
                {page.items.map((item, idx) => (
                  <div key={idx}>
                    {item.type === 'section' ? (
                      <div className="mb-3">
                        <div className="pb-1 border-b-2 flex justify-between items-end" style={{ borderColor: '#dc2626' }}>
                          <h3 className="font-bold text-lg uppercase tracking-wider" style={{ color: '#dc2626' }}>{item.data}</h3>
                          <span className="font-bold text-sm mb-1" style={{ color: '#dc2626' }}>({item.points} pts)</span>
                        </div>
                      </div>
                    ) : (
                      renderRealQuestion(item.data, item.dottedLinesHeight, item.points)
                    )}
                  </div>
                ))}
              </div>

              {/* Pied de page compact */}
              <div className="mt-auto border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-medium" style={{ height: `${FOOTER_HEIGHT}px`, flexShrink: 0 }}>
                <span className="uppercase tracking-widest truncate max-w-[30%] font-bold">{evaluation.title}</span>
                <div className="flex-grow flex justify-center">
                   <span className="font-bold text-slate-600 text-[10px]">..... / {page.items.reduce((acc, item) => item.type === 'question' ? acc + (item.points || 0) : acc, 0)}</span>
                </div>
                <span className="font-bold whitespace-nowrap w-[30%] text-right">Page {page.pageNumber} / {pages.length}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media screen {
          .a4-page {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
          }
        }
        
        @media print {
          @page { size: A4; margin: 0; }
          body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important;
            overflow: visible !important;
          }
          .no-print { display: none !important; }
          .pdf-modal-root {
             position: absolute !important; 
             width: 100% !important;
             height: auto !important;
             overflow: visible !important;
             z-index: 9999;
             background: white !important;
             top: 0 !important; left: 0 !important;
          }
          .print-wrapper { 
            display: block !important; 
            width: 100% !important; 
            padding: 0 !important; 
            margin: 0 !important; 
          }
          .a4-page {
             margin: 0 !important; 
             border: none !important; 
             box-shadow: none !important;
             width: 210mm !important; 
             height: 297mm !important; 
             min-height: 297mm !important;
             max-height: 297mm !important;
             overflow: hidden !important; 
             break-after: page; 
             page-break-after: always;
             print-color-adjust: exact; 
             -webkit-print-color-adjust: exact;
             box-sizing: border-box !important;
          }
          .page-item-container {
             page-break-inside: avoid;
             break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default PdfPreview;
