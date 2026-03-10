
import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, List, Image as ImageIcon, Heading1, Check, X, AlignLeft, AlignCenter, AlignRight, Maximize2, Superscript, Subscript, Sigma } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  const [showMathInput, setShowMathInput] = useState(false);
  const [mathLatex, setMathLatex] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // État pour la gestion de l'image sélectionnée
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgWidth, setImgWidth] = useState<number>(100);

  // Sync value to innerHTML when value changes externally
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
      // Attention : ceci réinitialise le curseur si on tape trop vite, 
      // mais nécessaire pour la synchronisation initiale ou externe.
      // On vérifie une égalité simple pour éviter les boucles.
      if (contentRef.current.innerHTML !== value) {
        contentRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedRange(selection.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    if (contentRef.current) {
      contentRef.current.focus();
    }
    if (savedRange) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      contentRef.current.focus();
    }
    handleInput();
  };

  const handleImageInsert = () => {
    if (imageUrl) {
      restoreSelection();
      // On insère l'image avec un style par défaut safe
      const html = `<img src="${imageUrl}" style="display: block; margin: 10px auto; width: 50%;" />`;
      document.execCommand('insertHTML', false, html);
      handleInput();
      setImageUrl('');
      setShowUrlInput(false);
    }
  };

  const handleMathInsert = () => {
    if (mathLatex) {
      restoreSelection();
      // Utilisation de math.vercel.app qui est plus permissif avec les CORS et l'encodage
      const url = `https://math.vercel.app/?from=${encodeURIComponent(mathLatex)}`;
      const html = `<img src="${url}" alt="${mathLatex}" style="display: inline-block; vertical-align: middle; padding: 0 2px;" class="math-equation" />`;
      document.execCommand('insertHTML', false, html);
      handleInput();
      setMathLatex('');
      setShowMathInput(false);
    }
  };

  // --- Gestion de la sélection d'image ---

  // Détecter le clic sur une image
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      // Désélectionner l'ancienne si différente
      if (selectedImg && selectedImg !== target) {
        selectedImg.classList.remove('editor-image-selected');
      }
      
      const img = target as HTMLImageElement;
      img.classList.add('editor-image-selected');
      setSelectedImg(img);

      // Récupérer la largeur actuelle (style inline ou attribut ou 100%)
      const currentStyleWidth = img.style.width;
      if (currentStyleWidth && currentStyleWidth.includes('%')) {
        setImgWidth(parseInt(currentStyleWidth));
      } else {
        setImgWidth(100);
      }
    } else {
      // Clic ailleurs : désélectionner
      if (selectedImg) {
        selectedImg.classList.remove('editor-image-selected');
        setSelectedImg(null);
      }
    }
  };

  // Mettre à jour le style de l'image sélectionnée
  const updateImageStyle = (styles: Partial<CSSStyleDeclaration>) => {
    if (selectedImg) {
      // Appliquer les styles
      Object.assign(selectedImg.style, styles);
      // Déclencher la sauvegarde
      handleInput();
    }
  };

  const setImageAlignment = (align: 'left' | 'center' | 'right') => {
    if (!selectedImg) return;
    
    // On utilise display block + margins pour l'alignement PDF robuste
    if (align === 'left') {
      updateImageStyle({ display: 'block', margin: '10px auto 10px 0' });
    } else if (align === 'center') {
      updateImageStyle({ display: 'block', margin: '10px auto' });
    } else if (align === 'right') {
      updateImageStyle({ display: 'block', margin: '10px 0 10px auto' });
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value);
    setImgWidth(newWidth);
    updateImageStyle({ width: `${newWidth}%` });
  };

  return (
    <div className={`border rounded-md bg-white relative ${className}`}>
      {/* Toolbar Standard */}
      <div className="flex items-center gap-1 bg-gray-50 p-2 border-b flex-wrap relative rounded-t-md">
        <button
          onClick={() => execCmd('bold')}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          type="button"
          title="Gras"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => execCmd('italic')}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          type="button"
          title="Italique"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => execCmd('superscript')}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          type="button"
          title="Exposant"
        >
          <Superscript size={16} />
        </button>
        <button
          onClick={() => execCmd('subscript')}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          type="button"
          title="Indice"
        >
          <Subscript size={16} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button
          onClick={() => execCmd('insertUnorderedList')}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          type="button"
          title="Liste à puces"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => execCmd('formatBlock', '<h2>')}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          type="button"
          title="Titre"
        >
          <Heading1 size={16} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        
        {/* Image Input Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { saveSelection(); setShowUrlInput(!showUrlInput); setShowMathInput(false); }}
            className={`p-1.5 rounded text-gray-700 ${showUrlInput ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            type="button"
            title="Insérer une image"
          >
            <ImageIcon size={16} />
          </button>
          
          {showUrlInput && (
            <div className="flex items-center gap-1 bg-white border rounded shadow-sm animate-fade-in absolute left-2 top-10 z-10 p-2">
              <input 
                type="text" 
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL de l'image (https://...)"
                className="text-xs p-1 border rounded outline-none w-48"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleImageInsert()}
              />
              <button 
                onClick={handleImageInsert}
                className="p-1 hover:bg-green-100 text-green-600 rounded"
                title="Valider"
              >
                <Check size={14} />
              </button>
              <button 
                onClick={() => { setShowUrlInput(false); setImageUrl(''); }}
                className="p-1 hover:bg-red-100 text-red-500 rounded"
                title="Annuler"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Math Input Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { saveSelection(); setShowMathInput(!showMathInput); setShowUrlInput(false); }}
            className={`p-1.5 rounded text-gray-700 ${showMathInput ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            type="button"
            title="Insérer une équation (LaTeX)"
          >
            <Sigma size={16} />
          </button>
          
          {showMathInput && (
            <div className="flex flex-col gap-3 bg-white border rounded-xl shadow-xl animate-fade-in absolute left-10 top-10 z-50 p-3 w-[380px]">
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  value={mathLatex}
                  onChange={(e) => setMathLatex(e.target.value)}
                  placeholder="Équation LaTeX (ex: E=mc^2)"
                  className="text-sm p-2 border rounded-lg outline-none flex-grow font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleMathInsert()}
                />
                <button 
                  onClick={handleMathInsert}
                  className="p-2 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                  title="Valider"
                >
                  <Check size={18} />
                </button>
                <button 
                  onClick={() => { setShowMathInput(false); setMathLatex(''); }}
                  className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                  title="Annuler"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-mono shadow-inner w-full">
                <div className="font-bold text-slate-800 mb-2 font-sans text-xs border-b border-slate-200 pb-1.5 flex justify-between items-center">
                  <span>Mémo LaTeX</span>
                  <span className="text-[9px] text-slate-400 font-normal uppercase tracking-wider">Copier-coller</span>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
                  <span className="text-slate-500 font-sans text-right text-[10px] uppercase tracking-wider font-bold">Exposant</span> 
                  <span className="select-all bg-white px-2 py-1 rounded border border-slate-200 cursor-text hover:border-indigo-300 transition-colors">x^&#123;n&#125;</span>
                  
                  <span className="text-slate-500 font-sans text-right text-[10px] uppercase tracking-wider font-bold">Indice</span> 
                  <span className="select-all bg-white px-2 py-1 rounded border border-slate-200 cursor-text hover:border-indigo-300 transition-colors">x_&#123;i&#125;</span>
                  
                  <span className="text-slate-500 font-sans text-right text-[10px] uppercase tracking-wider font-bold">Fraction</span> 
                  <span className="select-all bg-white px-2 py-1 rounded border border-slate-200 cursor-text hover:border-indigo-300 transition-colors">\frac&#123;X&#125;&#123;Y&#125;</span>
                  
                  <span className="text-slate-500 font-sans text-right text-[10px] uppercase tracking-wider font-bold">Racine</span> 
                  <span className="select-all bg-white px-2 py-1 rounded border border-slate-200 cursor-text hover:border-indigo-300 transition-colors">\sqrt&#123;x&#125;</span>
                  
                  <span className="text-slate-500 font-sans text-right text-[10px] uppercase tracking-wider font-bold">Grecque</span> 
                  <span className="select-all bg-white px-2 py-1 rounded border border-slate-200 cursor-text hover:border-indigo-300 transition-colors">\alpha, \beta</span>
                  
                  <span className="text-slate-500 font-sans text-right text-[10px] uppercase tracking-wider font-bold">Relation</span> 
                  <span className="select-all bg-white px-2 py-1 rounded border border-slate-200 cursor-text leading-relaxed hover:border-indigo-300 transition-colors">\leq (&lt;=) - \geq (&gt;=)<br/>\neq (diff.) - \approx (env. =)</span>
                  
                  <span className="text-slate-500 font-sans text-right text-[10px] uppercase tracking-wider font-bold">Parenth.</span> 
                  <span className="select-all bg-white px-2 py-1 rounded border border-slate-200 cursor-text hover:border-indigo-300 transition-colors">\left( \frac&#123;1&#125;&#123;2&#125; \right)</span>
                  
                  <span className="text-slate-500 font-sans text-right text-[10px] uppercase tracking-wider font-bold">Vecteur</span> 
                  <span className="select-all bg-white px-2 py-1 rounded border border-slate-200 cursor-text hover:border-indigo-300 transition-colors">\overrightarrow&#123;AB&#125;</span>
                  
                  <span className="text-slate-500 font-sans text-right text-[10px] uppercase tracking-wider font-bold">Barre</span> 
                  <span className="select-all bg-white px-2 py-1 rounded border border-slate-200 cursor-text hover:border-indigo-300 transition-colors">\overline&#123;AB&#125;</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- Toolbar Image (Contextuelle) --- */}
        {selectedImg && (
          <div className="flex items-center gap-2 ml-auto bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 animate-fade-in">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mr-1">Image</span>
            
            <div className="flex items-center gap-0.5 border-r border-indigo-200 pr-2 mr-2">
              <button onClick={() => setImageAlignment('left')} className="p-1 hover:bg-indigo-200 rounded text-indigo-600" title="Aligner à gauche">
                <AlignLeft size={14} />
              </button>
              <button onClick={() => setImageAlignment('center')} className="p-1 hover:bg-indigo-200 rounded text-indigo-600" title="Centrer">
                <AlignCenter size={14} />
              </button>
              <button onClick={() => setImageAlignment('right')} className="p-1 hover:bg-indigo-200 rounded text-indigo-600" title="Aligner à droite">
                <AlignRight size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Maximize2 size={12} className="text-indigo-400" />
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={imgWidth}
                onChange={handleWidthChange}
                className="w-20 h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                title={`Taille : ${imgWidth}%`}
              />
              <span className="text-[10px] font-mono text-indigo-600 w-8">{imgWidth}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Editor Area */}
      <div
        ref={contentRef}
        className="p-3 min-h-[100px] outline-none editor-content text-sm rounded-b-md"
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onClick={handleContentClick}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
