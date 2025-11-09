import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Performance optimizations
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'livekit-vendor': ['livekit-client', '@livekit/components-react'],
          'ui-vendor': ['lucide-react'],
          
          // Feature chunks
          'chat-features': [
            './src/components/ChatPanel.tsx',
            './src/components/OptimizedChatPanel.tsx',
            './src/components/EmojiPicker.tsx',
            './src/services/chatService.ts'
          ],
          'audio-features': [
            './src/components/AudioControls.tsx',
            './src/components/OptimizedAudioControls.tsx',
            './src/services/audioService.ts'
          ]
        }
      }
    },
    
    // Minification and optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug']
      }
    },
    
    // Source maps for debugging (disable in production)
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000
  },
  
  // Development server optimizations
  server: {
    // Enable HTTP/2 for better performance
    https: false,
    
    // Optimize HMR
    hmr: {
      overlay: true
    }
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'livekit-client',
      '@livekit/components-react',
      'lucide-react'
    ],
    exclude: [
      // Exclude large dependencies that should be loaded on demand
    ]
  },
  
  // Asset handling
  assetsInclude: ['**/*.woff2', '**/*.woff'],
  
  // Preview server (for production builds)
  preview: {
    port: 4173,
    strictPort: true
  }
})
