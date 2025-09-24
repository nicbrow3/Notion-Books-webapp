import React from 'react';
import { 
  ArrowSquareOutIcon, 
  PlusIcon, 
  XIcon,
  CheckCircleIcon,
  ArrowClockwiseIcon,
  BooksIcon
} from '@phosphor-icons/react';
import { ICON_CONTEXTS, ICON_WEIGHTS, ICON_SIZES } from '../../constants/iconConfig';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  notionUrl: string;
  categoriesCount: number;
  dateType: string;
  actionType: 'added' | 'updated' | 'added as separate entry';
  onAddAnotherBook: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  bookTitle,
  notionUrl,
  categoriesCount,
  dateType,
  actionType,
  onAddAnotherBook,
}) => {
  if (!isOpen) return null;

  const getSuccessIcon = () => {
    switch (actionType) {
      case 'updated':
        return (
          <ArrowClockwiseIcon 
            size={ICON_SIZES.XL} 
            weight={ICON_WEIGHTS.FILL} 
            className="text-blue-600" 
          />
        );
      case 'added as separate entry':
        return (
          <BooksIcon 
            size={ICON_SIZES.XL} 
            weight={ICON_WEIGHTS.FILL} 
            className="text-purple-600" 
          />
        );
      default:
        return (
          <CheckCircleIcon 
            size={ICON_SIZES.XL} 
            weight={ICON_WEIGHTS.FILL} 
            className="text-green-600" 
          />
        );
    }
  };

  const getSuccessTitle = () => {
    switch (actionType) {
      case 'updated':
        return 'Book Updated Successfully!';
      case 'added as separate entry':
        return 'Book Added as Separate Entry!';
      default:
        return 'Book Added Successfully!';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XIcon size={24} weight="light" />
        </button>

        {/* Header */}
        <div className="text-center mb-6 pr-8">
          <div className="flex justify-center mb-3">{getSuccessIcon()}</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {getSuccessTitle()}
          </h2>
          <p className="text-gray-600">
            "{bookTitle}" has been {actionType} in your Notion database
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => window.open(notionUrl, '_blank', 'noopener,noreferrer')}
            className="group w-full bg-blue-600 text-white py-6 px-6 rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold text-lg flex items-center justify-center gap-3 hover:scale-105 transform"
          >
            <ArrowSquareOutIcon
              size={ICON_SIZES.MD}
              weight={ICON_WEIGHTS.FILL}
              className="group-hover:animate-wiggle"
            />
            View in Notion
          </button>
          
          <button
            onClick={onAddAnotherBook}
            className="group w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <PlusIcon
              size={ICON_CONTEXTS.SETTINGS.DEFAULT}
              weight={ICON_WEIGHTS.FILL}
              className="group-hover:animate-wiggle"
            />
            Add Another Book
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal; 