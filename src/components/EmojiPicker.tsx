/**
 * Simple Emoji Picker Component
 * Lightweight emoji selection for chat messages
 */

import React, { memo } from 'react';
import { getAnimationClasses, getTransitionClasses } from '../utils/animations';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

// Common emoji categories
const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
  'Gestures': ['👍', '👎', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶'],
  'Objects': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️'],
  'Nature': ['🌱', '🌿', '🍀', '🍃', '🌾', '🌵', '🌲', '🌳', '🌴', '🌺', '🌻', '🌷', '🌹', '🥀', '🌸', '💐', '🍄', '🌰', '🎃', '🐚', '🌊', '⭐', '🌟', '💫', '✨', '☄️', '🌙', '☀️', '🌤️', '⛅']
};

const EmojiPicker: React.FC<EmojiPickerProps> = memo(({ onEmojiSelect, onClose }) => {
  return (
    <div className={`
      absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg
      w-80 max-h-64 overflow-y-auto z-50
      ${getAnimationClasses.slideIn('fast')}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-900">Choose an emoji</h4>
        <button
          onClick={onClose}
          className={`
            text-gray-400 hover:text-gray-600 p-1 rounded
            ${getTransitionClasses.colors('fast')}
          `}
        >
          ✕
        </button>
      </div>
      
      {/* Emoji categories */}
      <div className="p-2">
        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
          <div key={category} className="mb-4">
            <h5 className="text-xs font-medium text-gray-600 mb-2 px-1">
              {category}
            </h5>
            <div className="grid grid-cols-8 gap-1">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onEmojiSelect(emoji)}
                  className={`
                    p-2 text-lg rounded hover:bg-gray-100 
                    ${getTransitionClasses.colors('fast')}
                    focus:outline-none focus:ring-2 focus:ring-primary-500
                  `}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

EmojiPicker.displayName = 'EmojiPicker';

export default EmojiPicker;
