import React, { useState, useEffect, useRef } from 'react';
import { FaKeyboard, FaTimes, FaArrowUp, FaBackspace, FaRegArrowAltCircleLeft } from 'react-icons/fa';

interface OnScreenKeyboardProps {
    onClose: () => void;
}

const OnScreenKeyboard: React.FC<OnScreenKeyboardProps> = ({ onClose }) => {
    const [layout, setLayout] = useState<'default' | 'shift' | 'symbols'>('default');
    const [size, setSize] = useState({ width: 800, height: 320 });
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const keyboardRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

    useEffect(() => {
        setPosition({
            x: window.innerWidth / 2 - size.width / 2,
            y: window.innerHeight - size.height - 20,
        });
    }, []); // Run only once on mount to center the keyboard

    const keyLayouts = {
        default: [
            ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
            ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
            ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', 'Enter'],
            ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
            ['Symbols', 'Space']
        ],
        shift: [
            ['~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', 'Backspace'],
            ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{', '}', '|'],
            ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '"', 'Enter'],
            ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?', 'Shift'],
            ['Symbols', 'Space']
        ],
        symbols: [
            ['[', ']', '{', '}', '#', '%', '^', '*', '+', '=', 'Backspace'],
            ['~', '`', '€', '£', '¥', '•', '_', '\\', '|', '(', ')'],
            ['ABC', '±', '<', '>', '@', '&', '-', ';', ':', '!', '?', 'Enter'],
            ['Shift', 'Space', ',', '.', '/', 'Shift']
        ]
    };

    const handleInput = (key: string) => {
        const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            const start = activeElement.selectionStart || 0;
            const end = activeElement.selectionEnd || 0;
            const value = activeElement.value;
            const newValue = value.substring(0, start) + key + value.substring(end);
            
            const prototype = Object.getPrototypeOf(activeElement);
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
            nativeInputValueSetter?.call(activeElement, newValue);
            
            const event = new Event('input', { bubbles: true });
            activeElement.dispatchEvent(event);
            
            activeElement.selectionStart = activeElement.selectionEnd = start + key.length;
            activeElement.focus();
        }
    };

    const handleSpecialKey = (key: string) => {
        const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
             const start = activeElement.selectionStart || 0;
             const end = activeElement.selectionEnd || 0;
             const value = activeElement.value;

            if (key === 'Backspace') {
                const newValue = start === end ? value.substring(0, start - 1) + value.substring(end) : value.substring(0, start) + value.substring(end);
                const prototype = Object.getPrototypeOf(activeElement);
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
                nativeInputValueSetter?.call(activeElement, newValue);
                 const event = new Event('input', { bubbles: true });
                 activeElement.dispatchEvent(event);
                 activeElement.selectionStart = activeElement.selectionEnd = start === end ? Math.max(0, start - 1) : start;
            } else if (key === 'Enter') {
                 const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, keyCode: 13 });
                 activeElement.dispatchEvent(event);
            } else if (key === 'Space') {
                 handleInput(' ');
            }
             activeElement.focus();
        }

        if (key === 'Shift') {
            setLayout(layout === 'shift' ? 'default' : 'shift');
        } else if (key === 'Caps') {
             setLayout(layout === 'shift' ? 'default' : 'shift');
        } else if (key === 'Symbols' || key === 'ABC') {
            setLayout(layout === 'symbols' ? 'default' : 'symbols');
        }
    };

    const handleKeyPress = (key: string) => {
        const specialKeys = ['Backspace', 'Enter', 'Shift', 'Caps', 'Symbols', 'ABC', 'Tab', 'Space'];
        if (specialKeys.includes(key)) {
            handleSpecialKey(key);
        } else {
            handleInput(key);
            if(layout === 'shift') {
                setLayout('default');
            }
        }
    };

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if ('touches' in e) { // Touch event
            if (e.touches.length !== 1) return;
            dragStartPos.current = {
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y
            };
        } else { // Mouse event
            dragStartPos.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
            };
        }
        setIsDragging(true);
        e.preventDefault();
    };

    const handleResizeStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if ('touches' in e) { // Touch event
            if (e.touches.length !== 1) return;
            resizeStart.current = {
                mouseX: e.touches[0].clientX,
                mouseY: e.touches[0].clientY,
                width: size.width,
                height: size.height,
            };
        } else { // Mouse event
            resizeStart.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
                width: size.width,
                height: size.height,
            };
        }
        setIsResizing(true);
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleWindowMove = (e: MouseEvent | TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (isDragging) {
            setPosition({
                x: clientX - dragStartPos.current.x,
                y: clientY - dragStartPos.current.y
            });
        }
        if (isResizing) {
            const dx = clientX - resizeStart.current.mouseX;
            const dy = clientY - resizeStart.current.mouseY;
            setSize({
                width: Math.max(500, resizeStart.current.width + dx),
                height: Math.max(250, resizeStart.current.height + dy),
            });
        }
    };

    const handleWindowUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleWindowMove);
            window.addEventListener('mouseup', handleWindowUp);
            window.addEventListener('touchmove', handleWindowMove, { passive: false });
            window.addEventListener('touchend', handleWindowUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleWindowMove);
            window.removeEventListener('mouseup', handleWindowUp);
            window.removeEventListener('touchmove', handleWindowMove);
            window.removeEventListener('touchend', handleWindowUp);
        };
    }, [isDragging, isResizing]);

    return (
        <div 
            ref={keyboardRef}
            className="fixed z-50 p-2 rounded-lg bg-primary-cyan-900 text-white shadow-keyboard-light dark:bg-primary-orange-900 dark:shadow-keyboard-dark flex flex-col"
            style={{ 
                left: `${position.x}px`, 
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
            }}
        >
            <div 
                className="h-8 flex-shrink-0 flex justify-between items-center px-2 cursor-move rounded-t-md bg-white/10"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
            >
                <span className="font-semibold flex items-center gap-2"><FaKeyboard/> Virtual Keyboard</span>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20"><FaTimes/></button>
            </div>
            <div className="p-2 space-y-1.5 flex-grow flex flex-col">
                {(keyLayouts[layout] || keyLayouts.default).map((row, rowIndex) => (
                    <div key={rowIndex} className="flex justify-center space-x-1.5 flex-grow">
                        {row.map((key, keyIndex) => {
                            let keyClass = 'keyboard-key';
                            if (key === 'Space') {
                                keyClass += ' space-key';
                            } else if (key.length > 1 && key !== 'Tab') {
                                keyClass += ' special-key';
                            }

                            return (
                                <button key={keyIndex} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleKeyPress(key)} className={keyClass}>
                                    {key === 'Shift' && <FaArrowUp />}
                                    {key === 'Caps' && <FaArrowUp />}
                                    {key === 'Backspace' && <FaBackspace />}
                                    {key === 'Enter' && <FaRegArrowAltCircleLeft className="transform rotate-180" />}
                                    {key !== 'Shift' && key !== 'Caps' && key !== 'Backspace' && key !== 'Enter' && key}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div 
                className="resize-handle" 
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
            >
                <div className="resize-handle-inner"></div>
            </div>
        </div>
    );
};

export default OnScreenKeyboard;