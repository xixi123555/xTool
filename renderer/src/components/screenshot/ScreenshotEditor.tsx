import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  ArrowLeftIcon,
  RectangleIcon,
  CircleIcon,
  EditIcon,
  BookmarkIcon,
  CheckIcon,
} from '../../assets/icons';

type Tool = 'select' | 'rect' | 'ellipse' | 'text';

interface Annotation {
  id: string;
  type: 'rect' | 'ellipse' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color: string;
}

interface ScreenshotEditorProps {
  imageSrc: string;
  onBack: () => void;
  onConfirm: (editedImage: string) => void;
  onPin: (imageSrc: string) => void;
}

export function ScreenshotEditor({ imageSrc, onBack, onConfirm, onPin }: ScreenshotEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<Annotation> | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [textDisplayPos, setTextDisplayPos] = useState<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FF0000');

  // 加载图片
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        drawImage();
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // 绘制图片和所有标注
  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制图片
    ctx.drawImage(img, 0, 0);

    // 绘制所有标注
    annotations.forEach((annotation) => {
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = 3;

      if (annotation.type === 'rect') {
        // 只绘制边框，不填充
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      } else if (annotation.type === 'ellipse') {
        // 只绘制边框，不填充
        ctx.beginPath();
        const centerX = annotation.x + annotation.width / 2;
        const centerY = annotation.y + annotation.height / 2;
        const radiusX = Math.abs(annotation.width) / 2;
        const radiusY = Math.abs(annotation.height) / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (annotation.type === 'text' && annotation.text) {
        ctx.fillStyle = annotation.color;
        ctx.font = '20px Arial';
        ctx.fillText(annotation.text, annotation.x, annotation.y);
      }
    });

    // 绘制当前正在绘制的标注
    if (currentAnnotation && startPos) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 3;

      if (currentAnnotation.type === 'rect') {
        // 只绘制边框，不填充
        ctx.strokeRect(
          currentAnnotation.x!,
          currentAnnotation.y!,
          currentAnnotation.width!,
          currentAnnotation.height!
        );
      } else if (currentAnnotation.type === 'ellipse') {
        // 只绘制边框，不填充
        ctx.beginPath();
        const centerX = currentAnnotation.x! + currentAnnotation.width! / 2;
        const centerY = currentAnnotation.y! + currentAnnotation.height! / 2;
        const radiusX = Math.abs(currentAnnotation.width!) / 2;
        const radiusY = Math.abs(currentAnnotation.height!) / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }, [imageSrc, annotations, currentAnnotation, startPos, selectedColor]);

  useEffect(() => {
    drawImage();
  }, [drawImage]);

  // 获取画布坐标
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // 鼠标按下
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'text') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pos = getCanvasPos(e);
      setTextPos(pos);
      setTextDisplayPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setShowTextInput(true);
      return;
    }

    if (tool === 'rect' || tool === 'ellipse') {
      const pos = getCanvasPos(e);
      setStartPos(pos);
      setIsDrawing(true);
      setCurrentAnnotation({
        type: tool,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: selectedColor,
      });
    }
  };

  // 鼠标移动
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && startPos && (tool === 'rect' || tool === 'ellipse')) {
      const pos = getCanvasPos(e);
      setCurrentAnnotation({
        type: tool,
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y),
        color: selectedColor,
      });
    }
  };

  // 鼠标抬起
  const handleMouseUp = () => {
    if (isDrawing && currentAnnotation && (tool === 'rect' || tool === 'ellipse')) {
      if (currentAnnotation.width! > 5 && currentAnnotation.height! > 5) {
        setAnnotations([
          ...annotations,
          {
            id: Date.now().toString(),
            type: currentAnnotation.type as 'rect' | 'ellipse',
            x: currentAnnotation.x!,
            y: currentAnnotation.y!,
            width: currentAnnotation.width!,
            height: currentAnnotation.height!,
            color: selectedColor,
          },
        ]);
      }
      setCurrentAnnotation(null);
      setIsDrawing(false);
      setStartPos(null);
    }
  };

  // 添加文字
  const handleAddText = () => {
    if (textInput.trim() && textPos) {
      setAnnotations([
        ...annotations,
        {
          id: Date.now().toString(),
          type: 'text',
          x: textPos.x,
          y: textPos.y,
          width: 0,
          height: 0,
          text: textInput,
          color: selectedColor,
        },
      ]);
      setTextInput('');
      setTextPos(null);
      setTextDisplayPos(null);
      setShowTextInput(false);
    }
  };

  // 确认并导出图片
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onConfirm(dataUrl);
  };

  // 固定截图
  const handlePin = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onPin(dataUrl);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* 工具栏 */}
      <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 shadow-lg">
        <button
          onClick={onBack}
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200 flex items-center justify-center"
          title="返回"
        >
          <ArrowLeftIcon />
        </button>
        
        <div className="h-6 w-px bg-slate-600" />
        
        <div className="flex gap-1 bg-slate-700/50 p-1 rounded-lg">
          <button
            onClick={() => setTool('rect')}
            className={`p-2.5 rounded-md transition-all duration-200 ${
              tool === 'rect'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-600 hover:text-white'
            }`}
            title="矩形标记"
          >
            <RectangleIcon />
          </button>
          <button
            onClick={() => setTool('ellipse')}
            className={`p-2.5 rounded-md transition-all duration-200 ${
              tool === 'ellipse'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-600 hover:text-white'
            }`}
            title="椭圆标记"
          >
            <CircleIcon />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-2.5 rounded-md transition-all duration-200 ${
              tool === 'text'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-600 hover:text-white'
            }`}
            title="添加文字"
          >
            <EditIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="h-6 w-px bg-slate-600" />
        
        <div className="flex items-center gap-2 bg-slate-700/50 p-1.5 rounded-lg">
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-2 border-slate-600 hover:border-slate-500 transition"
            title="选择颜色"
          />
        </div>
        
        <div className="h-6 w-px bg-slate-600" />
        
        <button
          onClick={handlePin}
          className="p-2.5 text-slate-300 hover:text-white hover:bg-green-600 rounded-lg transition-all duration-200 flex items-center justify-center"
          title="固定到桌面"
        >
          <BookmarkIcon />
        </button>
        
        <button
          onClick={handleConfirm}
          className="p-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
          title="确认保存"
        >
          <CheckIcon className="h-5 w-5" />
        </button>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 overflow-auto bg-slate-950 p-4 relative">
        <div className="inline-block relative">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {/* 文字输入框 */}
          {showTextInput && textDisplayPos && (
            <div className="absolute z-50" style={{ left: textDisplayPos.x + 'px', top: textDisplayPos.y + 'px' }}>
              <div className="bg-white rounded shadow-lg p-2 border-2 border-blue-500">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddText();
                  } else if (e.key === 'Escape') {
                    setShowTextInput(false);
                    setTextInput('');
                    setTextPos(null);
                    setTextDisplayPos(null);
                  }
                  }}
                  autoFocus
                  className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入文字..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddText}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    确定
                  </button>
                  <button
                    onClick={() => {
                      setShowTextInput(false);
                      setTextInput('');
                      setTextPos(null);
                      setTextDisplayPos(null);
                    }}
                    className="px-2 py-1 text-xs bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

