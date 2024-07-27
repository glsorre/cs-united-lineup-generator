import { DndContext } from '@dnd-kit/core';
import { useCallback, useEffect, useReducer, useState } from 'react';

import './App.css';

import { Line } from './components/Line';
import { LineupPlayer } from './components/LineupPlayer';
import { Player } from './components/Player';

import { getPlayers } from './api/getPlayers';

const initialState = [
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
    case 'ADD_PLAYER_TO_LINE':
      const { playerId, line } = action.payload;
      return state.map((currentLine, index) => {
        if (index === line) {
          return [...currentLine, playerId];
        }
        return currentLine;
      });
    case 'REMOVE_PLAYER_FROM_LINE':
      const { player: playerIdToRemove, line: lineToRemove } = action.payload;
      return state.map((currentLine, index) => {
        if (index === lineToRemove) {
          return currentLine.filter(player => player !== playerIdToRemove);
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

  function printLines(lineup) {
    let str = '';
  
    for (let element of lineup) {
      if (Array.isArray(element)) str += printLines(element) + "\n";
      else {
        const player = players.find(p => p.id === element);
        str += player.surname + "\t";
      }
    }
  
    return str;
  }

  const cachedPrintLines = useCallback(printLines, [players, printLines]);
  
  function generatePaddingWithCentraChar(length, char) {
    const padding = ' '.repeat(length);
    const paddingLength = Math.floor(length / 2);
    return padding.substring(0, paddingLength) + char + padding.substring(paddingLength);
  }

  function handleDragStart(event) {
    const { active } = event;
    const [type] = active.id.split('_');

    if (type === 'player') {
      const element = document.getElementById(active.id);
      const rect = element.getBoundingClientRect();
      element.classList.add('dragging');
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
      element.style.top = `${rect.top}px`;
      element.style.left = `${rect.left}px`;
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    const [type, playerId, orginLine] = active?.id.split('_');

    const startingLine = parseInt(orginLine);
    const destinationLine = parseInt(over?.id);

    if (!active || !over || destinationLine === startingLine) {
      if (
        type === 'lineup' &&
        event.activatorEvent?.target?.classList.contains('lineup_field_line_player_remove_action')) {
        removePlayerFromLine(playerId, startingLine);
      }
      return;
    }

    let player = players.find(player => player.id === playerId);;

    switch (type) {
      case 'player':
        if (document.getElementById(active.id).classList.contains('dragging')) {
          document.getElementById(active.id).classList.remove('dragging');
        }
        const line = over.id;
        addPlayerToLine(player.id, line);
        player.inLineup = true;
        break;
      case 'lineup':
        if (destinationLine !== startingLine) {
          swapPlayerLine(playerId, startingLine, destinationLine);
        }
        break;
      default:
        break;
    }
  }

  function addPlayerToLine(playerId, line) {
    dispatch({ type: 'ADD_PLAYER_TO_LINE', payload: { playerId, line } });
  }

  function removePlayerFromLine(playerId, line) {
    dispatch({ type: 'REMOVE_PLAYER_FROM_LINE', payload: { player: playerId, line } });
    const player = players.find(p => p.id === playerId);
    player.inLineup = false;
  }

  function swapPlayerLine(playerId, originLine, destinationLine) {
    dispatch({ type: 'REMOVE_PLAYER_FROM_LINE', payload: { player: playerId, line: originLine } });
    dispatch({ type: 'ADD_PLAYER_TO_LINE', payload: { playerId, line: destinationLine } });
  }

  function addLine() {
    dispatch({ type: 'ADD_LINE' });
  }

  function removeLine(index) {
    dispatch({ type: 'REMOVE_LINE', payload: index });
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
    function formatLines(str) {
      const lines = str.split('\n');
      const maxLineElements = Math.max(...lines.map(line => line.split('\t').length));
      const maxLineLength = Math.max(...lines.map(line => line.length)) + (maxLineElements * 3);
      const results = [];
    
      results.push('[pre]');
      for (let line of lines) {
        if (line.length === 0) continue;
        if (line.length < maxLineLength) {
          const lineElements = line.split('\t');
          const numberOfElements = line.split('\t').length;
          const numberOfPadding = numberOfElements;
          const diff = (maxLineLength + (numberOfPadding * 3)) - line.length;
          const paddingLength = numberOfElements > 1 ? Math.floor(diff / numberOfPadding) : Math.ceil(diff / 2);
          const padding = generatePaddingWithCentraChar(paddingLength, '|');
          const result = numberOfElements > 1 ? lineElements.reduce(
            (acc, element, index, array) => {
              if (index === 0) return acc + ' '.repeat(paddingLength) + element;
              if (index === array.length - 1) return acc + element;
              return acc + padding + element;
            }, ''
          ) : line + ' '.repeat(diff);
          console.log(result);
          results.push(result);
        } else {
          const lineElements = line.split('\t');
          results.push(lineElements.reduce(
            (acc, element, index, array) => {
              if (index === 0 || index === array.length - 1) return acc + element;
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
          <input type='search' className='players_search' placeholder='Filter' onInput={(e) => setSearch(e.target.value)} />
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
          {lines.map((line, index) => (
            <Line key={index} id={index}>
              <div className="lineup_field_line_drop_area">
                {line.map((playerId, playerIndex) => {
                  const player = players.find(p => p.id === playerId);
                  return <LineupPlayer key={`lineup_${playerId}_${index}_${playerIndex}`} id={`lineup_${playerId}_${index}_${playerIndex}`}>
                    <div className='lineup_field_line_player_container'>
                      <h5 className="lineup_field_line_player_name">{`${playerIndex + 1}`} {player.surname}</h5>
                      <button className='lineup_field_line_player_remove_action'>❌</button>
                    </div>
                  </LineupPlayer>
                })}
              </div>
              <button className='lineup_field_remove_line_action' onClick={(event) => {
                removeLine(index);
              }}>🗑️</button>
            </Line>
          ))}
          <button className='lineup_field_add_line_action' onClick={(event) => {
            addLine();
          }}>➕</button>
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
    </DndContext >
  );
}

export default App;
