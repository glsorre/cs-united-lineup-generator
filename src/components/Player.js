import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export function Player(props) {
  const { id } = props;

  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: id
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  
  return (
    <li id={id} ref={setNodeRef} style={style} {...listeners} {...attributes} draggable>
      {props.children}
    </li>
  );
}