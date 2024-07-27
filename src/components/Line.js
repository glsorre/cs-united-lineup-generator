import React from 'react';
import { useDroppable } from '@dnd-kit/core';

export function Line(props) {

  const { id } = props;

  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  const style = {
    borderRadius: '10px',
    border: isOver ? '1px solid #333' : '1px dashed #ccc',
    backgroundColor: isOver ? '#f0f0f0' : 'transparent',
  };

  return (
    <div className="lineup_field_line" ref={setNodeRef} style={style}>
      {props.children}
    </div>
  );
}