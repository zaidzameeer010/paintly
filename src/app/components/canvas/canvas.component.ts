import { Component, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';
import { UploadMenuComponent } from './upload-menu.component';

type Tool = 'brush' | 'eraser' | 'upload';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule, UploadMenuComponent],
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
                (click)="setTool('brush')"
                (click)="toggleSizePopup('brush')"
                title="Brush Tool">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span class="toolbar-button-text">Brush</span>
              </button>
              
              <!-- Brush Size Popup -->
              <div *ngIf="showSizePopup && selectedTool === 'brush'"
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
                />
              </div>
            </div>

            <div class="relative">
              <button
                class="toolbar-button group"
                [class.active]="currentTool === 'eraser'"
                (click)="setTool('eraser')"
                (click)="toggleSizePopup('eraser')"
                title="Eraser Tool">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span class="toolbar-button-text">Eraser</span>
              </button>
            </div>

            <div class="relative">
              <button
                class="toolbar-button group"
                [class.active]="currentTool === 'upload'"
                (click)="toggleUploadMenu()"
                title="Upload">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span class="toolbar-button-text">Upload</span>
              </button>
              
              <!-- Upload Menu Popup -->
              <app-upload-menu
                *ngIf="showUploadMenu"
                (imageSelected)="handleImageUpload($event)"
                (videoSelected)="handleVideoUpload($event)"
              ></app-upload-menu>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CanvasComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private devicePixelRatio = window.devicePixelRatio || 1;
  private hoverCtx!: CanvasRenderingContext2D;  // Context for hover canvas
  private hoverCanvas!: HTMLCanvasElement;

  currentTool: Tool = 'brush';
  selectedTool: Tool | null = null;
  currentColor = '#3b82f6';
  brushSize = 5;
  showSizePopup = false;
  showUploadMenu = false;

  @HostListener('document:click', ['$event'])
  handleClick(event: MouseEvent) {
    // Close popup when clicking outside
    const target = event.target as HTMLElement;
    if (!target.closest('.size-popup') && !target.closest('.toolbar-button')) {
      this.showSizePopup = false;
      this.selectedTool = null;
    }
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    // Create hover canvas
    this.hoverCanvas = document.createElement('canvas');
    this.hoverCanvas.style.position = 'absolute';
    this.hoverCanvas.style.top = '0';
    this.hoverCanvas.style.left = '0';
    this.hoverCanvas.style.pointerEvents = 'none';  // Make it non-interactive
    canvas.parentElement?.appendChild(this.hoverCanvas);
    this.hoverCtx = this.hoverCanvas.getContext('2d')!;
    
    this.resizeCanvas();
    this.initializeCanvas();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.redrawCanvas();
    });

    // Add mousemove listener for hover effect
    canvas.addEventListener('mousemove', this.updateHoverCircle.bind(this));
    canvas.addEventListener('mouseleave', () => {
      this.clearHoverCanvas();
    });
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      // Set display size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Set actual size in memory (scaled for device pixel ratio)
      canvas.width = rect.width * this.devicePixelRatio;
      canvas.height = rect.height * this.devicePixelRatio;
      
      // Also resize hover canvas
      this.hoverCanvas.style.width = `${rect.width}px`;
      this.hoverCanvas.style.height = `${rect.height}px`;
      this.hoverCanvas.width = rect.width * this.devicePixelRatio;
      this.hoverCanvas.height = rect.height * this.devicePixelRatio;
      
      // Scale both contexts
      this.ctx?.scale(this.devicePixelRatio, this.devicePixelRatio);
      this.hoverCtx?.scale(this.devicePixelRatio, this.devicePixelRatio);
    }
  }

  private initializeCanvas() {
    if (this.ctx) {
      // Enable image smoothing for anti-aliasing
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvasRef.nativeElement.width / this.devicePixelRatio, 
                                this.canvasRef.nativeElement.height / this.devicePixelRatio);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.shadowBlur = 1;  // Add slight blur for smoother edges
    }
  }

  private redrawCanvas() {
    if (!this.ctx) return;
    const imageData = this.ctx.getImageData(0, 0, this.canvasRef.nativeElement.width / this.devicePixelRatio, 
                                          this.canvasRef.nativeElement.height / this.devicePixelRatio);
    this.resizeCanvas();
    this.ctx.putImageData(imageData, 0, 0);
  }

  startDrawing(event: MouseEvent) {
    this.isDrawing = true;
    [this.lastX, this.lastY] = this.getCoordinates(event);
    this.clearHoverCanvas();  // Clear hover circle when starting to draw
    
    // Start a new path and move to initial position
    this.ctx?.beginPath();
    this.ctx?.moveTo(this.lastX, this.lastY);
  }

  draw(event: MouseEvent) {
    if (!this.isDrawing || !this.ctx) return;

    const [currentX, currentY] = this.getCoordinates(event);
    
    // Calculate the mid-point between the last position and current position
    const midX = (this.lastX + currentX) / 2;
    const midY = (this.lastY + currentY) / 2;
    
    // Use quadratic bezier curves for smooth continuous strokes
    this.ctx.quadraticCurveTo(this.lastX, this.lastY, midX, midY);
    
    this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.stroke();
    
    // Continue the path from the midpoint
    this.ctx.beginPath();
    this.ctx.moveTo(midX, midY);
    
    [this.lastX, this.lastY] = [currentX, currentY];
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    
    // Complete the stroke
    this.ctx?.stroke();
    this.isDrawing = false;
    
    // Show hover circle again after stopping
    const event = new MouseEvent('mousemove', {
      clientX: this.lastX,
      clientY: this.lastY
    });
    this.updateHoverCircle(event);
  }

  handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.startDrawing(mouseEvent);
  }

  handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.draw(mouseEvent);
  }

  handleTouchEnd() {
    this.stopDrawing();
  }

  private getCoordinates(event: MouseEvent): [number, number] {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scaleX = this.canvasRef.nativeElement.width / (this.devicePixelRatio * rect.width);
    const scaleY = this.canvasRef.nativeElement.height / (this.devicePixelRatio * rect.height);
    
    return [
      (event.clientX - rect.left) * scaleX,
      (event.clientY - rect.top) * scaleY
    ];
  }

  setTool(tool: Tool) {
    this.currentTool = tool;
    gsap.from(`button.active`, {
      scale: 0.8,
      duration: 0.3,
      ease: 'back.out(1.7)'
    });
  }

  toggleSizePopup(tool: Tool) {
    if (this.selectedTool === tool && this.showSizePopup) {
      this.showSizePopup = false;
      this.selectedTool = null;
    } else {
      this.selectedTool = tool;
      this.showSizePopup = true;
    }
  }

  toggleUploadMenu() {
    this.showUploadMenu = !this.showUploadMenu;
  }

  onColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.currentColor = input.value;
  }

  onBrushSizeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.brushSize = parseInt(input.value);
  }

  getContrastColor(color: string) {
    const r = parseInt(color.substring(1, 3), 16);
    const g = parseInt(color.substring(3, 5), 16);
    const b = parseInt(color.substring(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000' : '#fff';
  }

  clearCanvas() {
    if (!this.ctx) return;
    gsap.to(this.canvasRef.nativeElement, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        if (!this.ctx) return;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvasRef.nativeElement.width / this.devicePixelRatio, 
                               this.canvasRef.nativeElement.height / this.devicePixelRatio);
        gsap.to(this.canvasRef.nativeElement, {
          opacity: 1,
          duration: 0.3
        });
      }
    });
  }

  downloadCanvas() {
    const link = document.createElement('a');
    link.download = 'paintly-drawing.png';
    link.href = this.canvasRef.nativeElement.toDataURL();
    link.click();
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
    this.redrawCanvas();
  }

  private updateHoverCircle(event: MouseEvent) {
    if (this.isDrawing) return;  // Don't show hover circle while drawing
    
    const [x, y] = this.getCoordinates(event);
    this.clearHoverCanvas();
    
    // Draw hover circle
    if (!this.hoverCtx) return;
    this.hoverCtx.beginPath();
    this.hoverCtx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
    this.hoverCtx.strokeStyle = this.currentTool === 'eraser' ? '#000' : this.currentColor;
    this.hoverCtx.lineWidth = 1;
    this.hoverCtx.stroke();
  }

  private clearHoverCanvas() {
    if (this.hoverCtx) {
      this.hoverCtx.clearRect(0, 0, this.hoverCanvas.width / this.devicePixelRatio, 
                                   this.hoverCanvas.height / this.devicePixelRatio);
    }
  }

  handleImageUpload(file: File) {
    if (!this.ctx) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (!this.ctx) return;
        const canvas = this.canvasRef.nativeElement;
        const aspectRatio = img.width / img.height;
        const maxWidth = canvas.width * 0.8;
        const maxHeight = canvas.height * 0.8;
        
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        }
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
        
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;
        
        this.ctx.drawImage(img, x, y, width, height);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    this.showUploadMenu = false;
  }

  handleVideoUpload(file: File) {
    if (!this.ctx) return;
    const video = document.createElement('video');
    video.controls = true;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      video.src = e.target?.result as string;
      video.onloadedmetadata = () => {
        if (!this.ctx) return;
        const canvas = this.canvasRef.nativeElement;
        const aspectRatio = video.videoWidth / video.videoHeight;
        const maxWidth = canvas.width * 0.8;
        const maxHeight = canvas.height * 0.8;
        
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        }
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
        
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;
        
        const drawFrame = () => {
          if (!this.ctx) return;
          this.ctx.drawImage(video, x, y, width, height);
          if (!video.paused && !video.ended) {
            requestAnimationFrame(drawFrame);
          }
        };
        
        video.play();
        drawFrame();
      };
    };
    reader.readAsDataURL(file);
    this.showUploadMenu = false;
  }
}
