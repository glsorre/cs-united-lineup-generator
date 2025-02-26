import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useCallback, useEffect, useReducer, useState } from 'react';

import './App.css';

import { Slot } from './components/Slot';
import { LineupPlayer } from './components/LineupPlayer';
import { Player } from './components/Player';

import { getPlayers } from './api/getPlayers';

const initialState = [
  [],
  [],
  [],
  []
];

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_LINE':
      return [...state, []];
    case 'REMOVE_LINE':
      return state.filter((_, index) => index !== action.payload);
    case 'SWAP_LINES':
      const { line1, line2 } = action.payload;
      const newState = [...state];
      const temp = newState[line1];
      newState[line1] = newState[line2];
      newState[line2] = temp;
      return newState;
    case 'ADD_PLAYER_TO_LINE':
      const { playerId, line, index } = action.payload;
      return state.map((currentLine, currentIndex) => {
        if (currentIndex === line) {
          return [...currentLine.slice(0, index), playerId, ...currentLine.slice(index)];
        }
        return currentLine;
      });
    case 'REMOVE_PLAYER_FROM_LINE':
      const { line: lineToRemove, index: indexToRemove } = action.payload;
      return state.map((currentLine, currentIndex) => {
        if (currentIndex === lineToRemove) {
          return currentLine.filter((_, index) => index !== indexToRemove);
        }
        return currentLine;
      });
    default:
      return state;
  }
}

function App() {
  const [players, setPlayers] = useState(null);
  const [search, setSearch] = useState('');
  const [lines, dispatch] = useReducer(reducer, initialState);
  const [draggedPlayer, setDraggedPlayer] = useState(null);

  function printLines(lineup) {
    let results = [];

    for (let [index, element] of lineup.entries()) {
      if (Array.isArray(element)) results.push(printLines(element));
      else {
        const player = players.find(p => p.id === element);
        results[index] = [...results[index] || [], player.surname];
      }
    }

    return results;
  }

  const cachedPrintLines = useCallback(printLines, [players, printLines]);

  function generatePaddingWithCentraChar(length, char) {
    const paddingLength = Math.floor(length / 2);
    return ' '.repeat(paddingLength) + char + ' '.repeat(paddingLength);
  }

  function handleDragStart(event) {
    const { active } = event;
    const [type, playerId] = active.id.split('_');

    if (type === 'player') {
      const player = players.find(player => player.id === playerId);
      setDraggedPlayer(player);
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    let [type, playerId, orginLine, origIndex] = active?.id.split('_');

    origIndex = parseInt(origIndex);
    orginLine = parseInt(orginLine);

    if (!active || !over) {
      setDraggedPlayer(null);
      return;
    }

    let player = players.find(player => player.id === playerId);

    let [destLine, destIndex] = over.id.split('_');
    destLine = parseInt(destLine);
    destIndex = parseInt(destIndex);

    switch (type) {
      case 'player':
        addPlayerToLine(player.id, destLine, destIndex);
        player.inLineup = true;
        if (search) setSearch('');
        break;
      case 'lineup':
        if (origIndex === destIndex && orginLine === destLine && playerId) {
          if (event.activatorEvent?.target?.classList.contains('lineup_field_line_player_remove_action')) {
            removePlayerFromLine(playerId, orginLine, origIndex);
            return;
          }
          return;
        }
        if (lines[destLine][destIndex]) {
          swapPlayers(playerId, orginLine, origIndex, destLine, destIndex);
          return;
        }
        else {
          movePlayer(playerId, orginLine, origIndex, destLine, destIndex);
          return;
        }
      default:
        break;
    }
  }

  function addPlayerToLine(playerId, line, index) {
    dispatch({ type: 'ADD_PLAYER_TO_LINE', payload: { playerId, line, index } });
  }

  function removePlayerFromLine(playerId, line, index) {
    dispatch({ type: 'REMOVE_PLAYER_FROM_LINE', payload: { line, index } });
    const player = players.find(p => p.id === playerId);
    player.inLineup = false;
  }

  function swapPlayers(playerId, startingLine, startingIndex, destLine, destIndex) {
    const playerToSwap = players.find(p => p.id === lines[destLine][destIndex]);
    dispatch({ type: 'REMOVE_PLAYER_FROM_LINE', payload: { player: playerId, line: startingLine, index: startingIndex } });
    dispatch({ type: 'REMOVE_PLAYER_FROM_LINE', payload: { player: playerToSwap.id, line: destLine, index: destIndex } });
    dispatch({ type: 'ADD_PLAYER_TO_LINE', payload: { playerId: playerToSwap.id, line: startingLine, index: startingIndex } });
    dispatch({ type: 'ADD_PLAYER_TO_LINE', payload: { playerId, line: destLine, index: destIndex } });
  }

  function movePlayer(playerId, startingLine, startingIndex, destLine, destIndex) {
    dispatch({ type: 'REMOVE_PLAYER_FROM_LINE', payload: { player: playerId, line: startingLine, index: startingIndex } });
    dispatch({ type: 'ADD_PLAYER_TO_LINE', payload: { playerId, line: destLine, index: destIndex } });
  }

  function addLine() {
    dispatch({ type: 'ADD_LINE' });
  }

  function removeLine(index) {
    dispatch({ type: 'REMOVE_LINE', payload: index });
    lines[index].forEach(playerId => {
      const player = players.find(p => p.id === playerId);
      player.inLineup = false;
    });
  }

  function swapLines(line1, line2) {
    dispatch({ type: 'SWAP_LINES', payload: { line1, line2 } });
  }

  function getPlayersNumber() {
    let playersNumber = 0;
    for (let line of lines) {
      playersNumber += line.length;
    }
    return playersNumber;
  }

  useEffect(() => {
    const fetchPlayers = async () => {
      const players = await getPlayers();
      setPlayers(players);
    };

    fetchPlayers();
  }, []);

  useEffect(() => {
    function formatLines(lines) {
      const maxLineElements = Math.max(...lines.map(line => line.length));
      const maxLineLength = Math.max(...lines.map(line => line.join('').length));
      let paddedMaxLineLength = maxLineLength + (Math.max(0, maxLineElements - 1)) * 3;
      const isPaddedMaxLineLengthEven = paddedMaxLineLength % 2 === 0;
      if (isPaddedMaxLineLengthEven) paddedMaxLineLength += 1;
      const results = [];      

      results.push('[pre]');
      for (let line of lines) {
        const lineLength = line.join('').length;
        const numberOfElements = line.length;
        if (line.join('').length < maxLineLength) {          
          const diff = paddedMaxLineLength - lineLength;
          const paddingLength = Math.abs(-Math.round(-(diff / (numberOfElements + 1))));
          const padding = generatePaddingWithCentraChar(paddingLength, '|');
          const paddedLineLength = lineLength + padding.length * (numberOfElements - 1);
          let leftMargin = Math.abs(-Math.round(-((paddedMaxLineLength - paddedLineLength) / 2)));
          if (!isPaddedMaxLineLengthEven && paddedLineLength % 2 === 0) leftMargin += 1;
          const result = numberOfElements > 1 ? line.reduce(
            (acc, element, index) => {
              if (index === 0) return acc + ' '.repeat(leftMargin) + element;
              return acc + padding + element;
            }, ''
          ) : ' '.repeat(leftMargin) + line.join('');
          results.push(result);
        } else {
          results.push(line.reduce(
            (acc, element, index) => {
              if (index === 0) return acc + element;
              return acc + ' | ' + element;
            }, ''));
        }
      }
      results.push('[/pre]');

      const result_str = results.join('\n');
      return result_str;
    }

    if (players && lines) {
      const output = document.querySelector('.lineup_output_textarea');
      const content = formatLines(cachedPrintLines(lines));
      if (output !== null) output.value = content;
    }
  }, [lines, players, cachedPrintLines]);

  if (!players) {
    return <div className='loading'>Loading...</div>;
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="App">
        <section className='players'>
          <h1 className='players_title'>Squad</h1>
          <input value={search} type='search' className='players_search' placeholder='Filter' onInput={(e) => setSearch(e.target.value)} />
          <ul className='players_list'>
            {
              players && players
                .filter(player => !player.inLineup)
                .filter(player => player.surname.toLowerCase().includes(search.toLowerCase()))
                .map(player => (
                  <Player key={`player_${player.id}`} id={`player_${player.id}`}>
                    <li className='players_card'>
                      <h5 className='players_card_name'>{player.surname}</h5>
                      <p className='players_card_label'>{player.position}</p>
                    </li>
                  </Player>
                ))
            }
          </ul>
        </section>
        <section className='lineup'>
          <div className='lineup_field'>
            <h1>Line Up</h1>
            <h4>{`There are ${getPlayersNumber()} players and ${lines.length} lines.`}</h4>
            <div className='lineup_field_lines_container'>
            {lines.map((line, lineIndex) => {
              const lineLength = line.length + 1;
              return <div className='lineup_field_line_container' key={`line_${lineIndex}`} id={`${lineIndex}`}>
                <div className="lineup_field_line_drop_area">
                  {[...Array(lineLength).keys()].map((_, slotIndex) => {
                    if (slotIndex === lineLength - 1) {
                      return <Slot key={`${lineIndex}_${slotIndex}`} id={`${lineIndex}_${slotIndex}`}>                 
                        <div className='lineup_field_line_player_container lineup_field_line_player_container_empty'>
                          <h5 className="lineup_field_line_player_name">Drop Player...</h5>
                        </div>
                      </Slot>
                    } else {
                    const playerId = line[slotIndex];
                    const player = players.find(p => p.id === playerId);
                    return <Slot key={`${lineIndex}_${slotIndex}`} id={`${lineIndex}_${slotIndex}`}>
                      <LineupPlayer key={`lineup_${playerId}_${lineIndex}_${slotIndex}`} id={`lineup_${playerId}_${lineIndex}_${slotIndex}`}>
                        <div className='lineup_field_line_player_container'>
                          <h5 className="lineup_field_line_player_name">{player.surname}</h5>
                          <button className='lineup_field_line_player_remove_action'>❌</button>
                        </div>
                      </LineupPlayer>
                    </Slot>
                    }
                  })}
                </div>
                <button disabled={lineIndex === 0} className='lineup_field_move_up_line_action' onClick={(event) => {
                  swapLines(lineIndex, lineIndex - 1);
                }}>🔼</button>
                <button disabled={lineIndex === lines.length - 1} className='lineup_field_move_down_line_action' onClick={(event) => {
                  swapLines(lineIndex, lineIndex + 1);
                }}>🔽</button>
                <button className='lineup_field_remove_line_action' onClick={(event) => {
                  removeLine(lineIndex);
                }}>🗑️</button>
              </div>
            })}
            <button className='lineup_field_add_line_action' onClick={(event) => {
              addLine();
            }}>➕</button>
          </div>
          </div>
          <div className='lineup_output'>
            <h1>
              Code
            </h1>
            <textarea className='lineup_output_textarea' wrap='on'>
            </textarea>
            <button onClick={
              () => {
                navigator.clipboard.writeText(document.querySelector('.lineup_output_textarea').value);
              }
            }>Copy to clipboard</button>
          </div>
        </section>
      </main>

      <DragOverlay>
        {draggedPlayer && <Player key={`player_${draggedPlayer.id}`} id={`player_${draggedPlayer.id}`}>
          <li className='players_card'>
            <h5 className='players_card_name'>{draggedPlayer.surname}</h5>
            <p className='players_card_label'>{draggedPlayer.position}</p>
          </li>
        </Player>}
      </DragOverlay>
    </DndContext >
  );
}

export default App;
