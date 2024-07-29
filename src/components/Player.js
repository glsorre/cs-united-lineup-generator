import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export function Player(props) {
  const { id } = props;

  const {attributes, listeners, setNodeRef} = useDraggable({
    id: id
  });
  
  return (
    <li id={id} ref={setNodeRef} {...listeners} {...attributes} draggable>
      {props.children}
    </li>
  );
}