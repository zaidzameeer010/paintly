import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="size-popup" (click)="$event.stopPropagation()">
      <button
        class="upload-option"
        (click)="triggerImageUpload()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Image</span>
      </button>
      <button
        class="upload-option"
        (click)="triggerVideoUpload()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>Video</span>
      </button>
    </div>
    <input
      #imageInput
      type="file"
      accept="image/*"
      class="hidden"
      (change)="onImageSelected($event)"
    />
    <input
      #videoInput
      type="file"
      accept="video/*"
      class="hidden"
      (change)="onVideoSelected($event)"
    />
  `,
  styles: [`
    .size-popup {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border: 1px solid rgba(209, 213, 219, 0.5);
      border-radius: 1rem;
      padding: 0.5rem;
      margin-bottom: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      backdrop-filter: blur(8px);
      background-color: rgba(255, 255, 255, 0.8);
    }
    .upload-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      width: 100%;
      border-radius: 0.5rem;
      transition: all 0.2s;
    }
    .upload-option:hover {
      background-color: rgba(243, 244, 246, 0.8);
    }
    .upload-option span {
      font-size: 0.875rem;
      color: #374151;
    }
  `]
})
export class UploadMenuComponent {
  @Output() imageSelected = new EventEmitter<File>();
  @Output() videoSelected = new EventEmitter<File>();

  triggerImageUpload() {
    const imageInput = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    imageInput?.click();
  }

  triggerVideoUpload() {
    const videoInput = document.querySelector('input[accept="video/*"]') as HTMLInputElement;
    videoInput?.click();
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.imageSelected.emit(file);
    }
  }

  onVideoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.videoSelected.emit(file);
    }
  }
}
