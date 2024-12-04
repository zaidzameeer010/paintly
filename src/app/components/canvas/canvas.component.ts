import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';

type Tool = 'brush' | 'eraser';

interface MediaElement {
  type: 'image' | 'video';
  element: HTMLImageElement | HTMLVideoElement;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
  selected: boolean;
}

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full h-full bg-gray-50">
      <canvas #canvas 
        class="w-full h-full touch-none"
        (mousedown)="startDrawing($event)"
        (mousemove)="draw($event)"
        (mouseup)="stopDrawing()"
        (mouseleave)="stopDrawing()"
        (touchstart)="handleTouchStart($event)"
        (touchmove)="handleTouchMove($event)"
        (touchend)="handleTouchEnd()">
      </canvas>

      <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div class="backdrop-blur-lg bg-white/80 rounded-2xl shadow-lg border border-gray-200/50 p-2">
          <div class="flex items-center space-x-2">
            <div class="relative">
              <button
                class="toolbar-button group"
                [class.active]="currentTool === 'brush'"
                (click)="toggleSizePopup('brush')"
                title="Brush">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span class="toolbar-button-text">Brush</span>
              </button>
              
              <!-- Brush Size Popup -->
              <div *ngIf="showSizePopup && currentTool === 'brush'"
                   class="size-popup"
                   (click)="$event.stopPropagation()">
                <div class="size-preview" 
                     [style.width.px]="brushSize" 
                     [style.height.px]="brushSize"
                     [style.background-color]="currentColor">
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50"
                  [(ngModel)]="brushSize"
                  (input)="onBrushSizeChange($event)"
                />
              </div>
            </div>

            <!-- Color Picker Button -->
            <div class="relative">
              <button
                class="toolbar-button group"
                title="Color Picker"
                [style.color]="currentColor">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" class="w-5 h-5">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16z"/>
                </svg>
                <input 
                  type="color"
                  [value]="currentColor"
                  (change)="onColorChange($event)"
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span class="toolbar-button-text">Color</span>
              </button>
            </div>

            <div class="relative">
              <button
                class="toolbar-button group"
                [class.active]="currentTool === 'eraser'"
                (click)="toggleSizePopup('eraser')"
                title="Eraser Tool">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span class="toolbar-button-text">Eraser</span>
              </button>

              <!-- Eraser Size Popup -->
              <div *ngIf="showSizePopup && currentTool === 'eraser'"
                   class="size-popup"
                   (click)="$event.stopPropagation()">
                <div class="size-preview" 
                     [style.width.px]="brushSize" 
                     [style.height.px]="brushSize"
                     style="background-color: rgba(255, 255, 255, 0.3); border: 1px solid black;">
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50"
                  [(ngModel)]="brushSize"
                  (input)="onBrushSizeChange($event)"
                />
              </div>
            </div>

            <div class="relative">
              <button
                class="toolbar-button group"
                (click)="clearCanvas()"
                title="Clear Canvas">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span class="toolbar-button-text">Clear Canvas</span>
              </button>
            </div>

            <div class="relative">
              <button
                class="toolbar-button group"
                (click)="downloadCanvas()"
                title="Download">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span class="toolbar-button-text">Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private devicePixelRatio = window.devicePixelRatio || 1;
  private resizeListener: () => void;
  private mouseMoveListener: (e: MouseEvent) => void;
  private mouseLeaveListener: () => void;
  private hoverCtx: CanvasRenderingContext2D | null = null;
  private hoverCanvas: HTMLCanvasElement | null = null;
  private canvasState: ImageData | null = null;
  private activeMedia: MediaElement | null = null;
  private isResizing = false;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private originalWidth = 0;
  private originalHeight = 0;

  currentTool: Tool = 'brush';
  currentColor = '#3b82f6';
  brushSize = 5;
  showSizePopup = false;

  constructor() {
    this.resizeListener = this.handleResize.bind(this);
    this.mouseMoveListener = this.updateHoverCircle.bind(this);
    this.mouseLeaveListener = this.clearHoverCanvas.bind(this);
  }

  @HostListener('document:click', ['$event'])
  handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.size-popup') && !target.closest('.toolbar-button')) {
      this.showSizePopup = false;
    }
  }

  ngAfterViewInit() {
    try {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2D context from canvas');
      }
      this.ctx = ctx;

      // Create hover canvas
      const hoverCanvas = document.createElement('canvas');
      hoverCanvas.style.position = 'absolute';
      hoverCanvas.style.top = '0';
      hoverCanvas.style.left = '0';
      hoverCanvas.style.pointerEvents = 'none';
      canvas.parentElement?.appendChild(hoverCanvas);
      this.hoverCanvas = hoverCanvas;

      const hoverCtx = hoverCanvas.getContext('2d');
      if (!hoverCtx) {
        throw new Error('Could not get 2D context from hover canvas');
      }
      this.hoverCtx = hoverCtx;

      this.resizeCanvas();
      this.initializeCanvas();

      // Add event listeners
      window.addEventListener('resize', this.resizeListener);
      canvas.addEventListener('mousemove', this.mouseMoveListener);
      canvas.addEventListener('mouseleave', this.mouseLeaveListener);
    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.resizeListener);
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('mousemove', this.mouseMoveListener);
      canvas.removeEventListener('mouseleave', this.mouseLeaveListener);
    }
    if (this.hoverCanvas) {
      this.hoverCanvas.remove();
    }
    gsap.killTweensOf('button.active');
  }

  private handleResize() {
    this.saveCanvasState();
    this.resizeCanvas();
    this.restoreCanvasState();
  }

  private saveCanvasState() {
    if (!this.ctx) return;
    try {
      this.canvasState = this.ctx.getImageData(
        0, 0,
        this.canvasRef.nativeElement.width / this.devicePixelRatio,
        this.canvasRef.nativeElement.height / this.devicePixelRatio
      );
    } catch (error) {
      console.error('Error saving canvas state:', error);
    }
  }

  private restoreCanvasState() {
    if (!this.ctx || !this.canvasState) return;
    try {
      this.ctx.putImageData(this.canvasState, 0, 0);
    } catch (error) {
      console.error('Error restoring canvas state:', error);
    }
  }

  private resizeCanvas() {
    try {
      const canvas = this.canvasRef.nativeElement;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      // Set display size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Set actual size in memory
      canvas.width = rect.width * this.devicePixelRatio;
      canvas.height = rect.height * this.devicePixelRatio;
      
      // Scale context
      this.ctx?.scale(this.devicePixelRatio, this.devicePixelRatio);

      // Also resize hover canvas
      if (this.hoverCanvas) {
        this.hoverCanvas.style.width = `${rect.width}px`;
        this.hoverCanvas.style.height = `${rect.height}px`;
        this.hoverCanvas.width = rect.width * this.devicePixelRatio;
        this.hoverCanvas.height = rect.height * this.devicePixelRatio;
        this.hoverCtx?.scale(this.devicePixelRatio, this.devicePixelRatio);
      }
    } catch (error) {
      console.error('Error resizing canvas:', error);
    }
  }

  private initializeCanvas() {
    if (!this.ctx) return;
    
    try {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      
      // Set initial canvas background
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, 
        this.canvasRef.nativeElement.width / this.devicePixelRatio,
        this.canvasRef.nativeElement.height / this.devicePixelRatio
      );
      
      // Set default drawing styles
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.globalCompositeOperation = 'source-over';
      
      // Save initial state
      this.saveCanvasState();
    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }

  startDrawing(event: MouseEvent) {
    if (!this.ctx) return;
    
    try {
      this.isDrawing = true;
      [this.lastX, this.lastY] = this.getCoordinates(event);
      
      // Set composite operation and styles based on tool
      if (this.currentTool === 'eraser') {
        this.ctx.globalCompositeOperation = 'destination-out';
      } else {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = this.currentColor;
      }
      
      this.ctx.lineWidth = this.brushSize;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      // Start the path
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);

      // Clear hover circle when starting to draw
      this.clearHoverCanvas();
    } catch (error) {
      console.error('Error starting drawing:', error);
      this.isDrawing = false;
    }
  }

  draw(event: MouseEvent) {
    if (!this.isDrawing || !this.ctx) return;

    try {
      const [currentX, currentY] = this.getCoordinates(event);
      
      // Calculate the midpoint
      const midX = (this.lastX + currentX) / 2;
      const midY = (this.lastY + currentY) / 2;
      
      // Draw a quadratic curve to the midpoint
      this.ctx.quadraticCurveTo(this.lastX, this.lastY, midX, midY);
      this.ctx.stroke();
      
      // Move to the midpoint to continue the path
      this.ctx.beginPath();
      this.ctx.moveTo(midX, midY);
      
      // Update last position
      [this.lastX, this.lastY] = [currentX, currentY];
    } catch (error) {
      console.error('Error during drawing:', error);
      this.stopDrawing();
    }
  }

  stopDrawing() {
    if (!this.ctx) return;

    try {
      if (this.isDrawing) {
        this.isDrawing = false;
        
        // Reset composite operation and stroke style to default
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = this.currentColor;
        
        // Save the canvas state
        this.saveCanvasState();
      }
    } catch (error) {
      console.error('Error stopping drawing:', error);
    }
  }

  handleTouchStart(event: TouchEvent) {
    try {
      event.preventDefault();
      const touch = event.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.startDrawing(mouseEvent);
    } catch (error) {
      console.error('Error handling touch start:', error);
    }
  }

  handleTouchMove(event: TouchEvent) {
    try {
      event.preventDefault();
      const touch = event.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.draw(mouseEvent);
    } catch (error) {
      console.error('Error handling touch move:', error);
    }
  }

  handleTouchEnd() {
    try {
      this.stopDrawing();
    } catch (error) {
      console.error('Error handling touch end:', error);
    }
  }

  private getCoordinates(event: MouseEvent): [number, number] {
    try {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const scaleX = this.canvasRef.nativeElement.width / (this.devicePixelRatio * rect.width);
      const scaleY = this.canvasRef.nativeElement.height / (this.devicePixelRatio * rect.height);
      
      return [
        (event.clientX - rect.left) * scaleX,
        (event.clientY - rect.top) * scaleY
      ];
    } catch (error) {
      console.error('Error getting coordinates:', error);
      return [0, 0];
    }
  }

  toggleSizePopup(tool: Tool) {
    try {
      if (this.showSizePopup && this.currentTool === tool) {
        this.showSizePopup = false;
      } else {
        this.currentTool = tool;
        this.showSizePopup = true;
        gsap.from(`button.active`, {
          scale: 0.8,
          duration: 0.3,
          ease: 'back.out(1.7)'
        });
      }
    } catch (error) {
      console.error('Error toggling size popup:', error);
    }
  }

  onColorChange(event: Event) {
    try {
      const input = event.target as HTMLInputElement;
      this.currentColor = input.value;
    } catch (error) {
      console.error('Error changing color:', error);
    }
  }

  onBrushSizeChange(event: Event) {
    try {
      const input = event.target as HTMLInputElement;
      this.brushSize = parseInt(input.value);
    } catch (error) {
      console.error('Error changing brush size:', error);
    }
  }

  getContrastColor(color: string) {
    try {
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? '#000' : '#fff';
    } catch (error) {
      console.error('Error calculating contrast color:', error);
      return '#000';
    }
  }

  clearCanvas() {
    if (!this.ctx) return;

    try {
      const canvas = this.canvasRef.nativeElement;
      const { width, height } = canvas;

      // Create a temporary canvas to store the current state
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Copy current canvas content to temp canvas
      tempCtx.drawImage(canvas, 0, 0);

      // Clear the main canvas
      this.ctx.clearRect(0, 0, width / this.devicePixelRatio, height / this.devicePixelRatio);

      // Position the temporary canvas absolutely over the main canvas
      tempCanvas.style.position = 'absolute';
      tempCanvas.style.top = canvas.offsetTop + 'px';
      tempCanvas.style.left = canvas.offsetLeft + 'px';
      tempCanvas.style.width = canvas.offsetWidth + 'px';
      tempCanvas.style.height = canvas.offsetHeight + 'px';
      tempCanvas.style.pointerEvents = 'none';
      canvas.parentElement?.appendChild(tempCanvas);

      // Animate the temporary canvas
      gsap.to(tempCanvas, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          tempCanvas.remove();
          this.saveCanvasState();
        }
      });
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
  }

  downloadCanvas() {
    try {
      const canvas = this.canvasRef.nativeElement;
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'paintly-drawing.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error downloading canvas:', error);
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.saveCanvasState();
    this.resizeCanvas();
    this.restoreCanvasState();
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (!this.activeMedia) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if clicking resize handle
    const handleSize = 8;
    if (
      x >= this.activeMedia.x + this.activeMedia.width - handleSize &&
      x <= this.activeMedia.x + this.activeMedia.width &&
      y >= this.activeMedia.y + this.activeMedia.height - handleSize &&
      y <= this.activeMedia.y + this.activeMedia.height
    ) {
      this.isResizing = true;
      this.resizeStartX = x;
      this.resizeStartY = y;
      this.originalWidth = this.activeMedia.width;
      this.originalHeight = this.activeMedia.height;
      return;
    }

    // Check if clicking media
    if (
      x >= this.activeMedia.x &&
      x <= this.activeMedia.x + this.activeMedia.width &&
      y >= this.activeMedia.y &&
      y <= this.activeMedia.y + this.activeMedia.height
    ) {
      this.activeMedia.selected = true;
      this.lastX = x - this.activeMedia.x;
      this.lastY = y - this.activeMedia.y;
      this.isDrawing = false;
    } else {
      this.activeMedia.selected = false;
    }
    this.redrawCanvas();
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.activeMedia || !this.activeMedia.selected) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.isResizing) {
      const dx = x - this.resizeStartX;
      const newWidth = this.originalWidth + dx;
      const newHeight = newWidth / this.activeMedia.aspectRatio;

      // Ensure minimum size
      if (newWidth >= 50 && newHeight >= 50) {
        this.activeMedia.width = newWidth;
        this.activeMedia.height = newHeight;
      }
    } else {
      this.activeMedia.x = x - this.lastX;
      this.activeMedia.y = y - this.lastY;
    }

    this.redrawCanvas();
  }

  @HostListener('mouseup')
  onMouseUp() {
    this.isResizing = false;
    if (this.activeMedia?.selected) {
      this.saveCanvasState();
    }
  }

  private redrawCanvas() {
    if (!this.ctx || !this.activeMedia) return;

    const { width, height } = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, width, height);

    // Restore previous canvas state if exists
    if (this.canvasState) {
      this.ctx.putImageData(this.canvasState, 0, 0);
    }

    // Draw the media element
    this.ctx.drawImage(
      this.activeMedia.element,
      this.activeMedia.x,
      this.activeMedia.y,
      this.activeMedia.width,
      this.activeMedia.height
    );

    // Draw selection border if selected
    if (this.activeMedia.selected) {
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(
        this.activeMedia.x,
        this.activeMedia.y,
        this.activeMedia.width,
        this.activeMedia.height
      );
      this.ctx.setLineDash([]);

      // Draw resize handle
      this.ctx.fillStyle = '#3b82f6';
      const handleSize = 8;
      this.ctx.fillRect(
        this.activeMedia.x + this.activeMedia.width - handleSize / 2,
        this.activeMedia.y + this.activeMedia.height - handleSize / 2,
        handleSize,
        handleSize
      );
    }
  }

  private updateHoverCircle(event: MouseEvent) {
    if (this.isDrawing || !this.hoverCtx || !this.hoverCanvas) return;
    
    try {
      const [x, y] = this.getCoordinates(event);

      // Clear previous hover circle
      this.clearHoverCanvas();

      // Draw new hover circle
      this.hoverCtx.beginPath();
      this.hoverCtx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
      
      if (this.currentTool === 'eraser') {
        this.hoverCtx.strokeStyle = '#000000';
        this.hoverCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      } else {
        this.hoverCtx.strokeStyle = this.currentColor;
        this.hoverCtx.fillStyle = 'rgba(0, 0, 0, 0)';
      }
      
      this.hoverCtx.lineWidth = 1;
      this.hoverCtx.stroke();
      this.hoverCtx.fill();
    } catch (error) {
      console.error('Error updating hover circle:', error);
    }
  }

  private clearHoverCanvas() {
    if (!this.hoverCtx || !this.hoverCanvas) return;

    try {
      this.hoverCtx.clearRect(
        0, 0,
        this.hoverCanvas.width / this.devicePixelRatio,
        this.hoverCanvas.height / this.devicePixelRatio
      );
    } catch (error) {
      console.error('Error clearing hover canvas:', error);
    }
  }
}
