import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Check, X } from 'lucide-react';

interface EditableListProps {
  items: string[];
  onItemsChange: (items: string[]) => void;
  placeholder: string;
  itemColor?: string;
}

export const EditableList: React.FC<EditableListProps> = ({
  items,
  onItemsChange,
  placeholder,
  itemColor = 'neo-blue'
}) => {
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      onItemsChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValue(items[index]);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      const newItems = [...items];
      newItems[editingIndex] = editValue.trim();
      onItemsChange(newItems);
      setEditingIndex(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {editingIndex === index ? (
              <>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="neo-input flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                />
                <Button
                  onClick={saveEdit}
                  size="sm"
                  className="neo-button"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  onClick={cancelEdit}
                  size="sm"
                  variant="outline"
                  className="neo-button-secondary"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <Badge 
                    variant="secondary" 
                    className={`neo-card ${itemColor} text-black dark:text-white font-bold cursor-pointer hover:opacity-80`}
                    onClick={() => startEditing(index)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    {item}
                  </Badge>
                </div>
                <Button
                  onClick={() => removeItem(index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          className="neo-input"
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
        />
        <Button onClick={addItem} className="neo-button" size="sm">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};