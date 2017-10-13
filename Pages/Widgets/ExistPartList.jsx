import React from 'react';
export function ExistPartsList({show, actions}) {
  if (!show) {
    return null;
  }

  return <div className='exist-part-list'>
    <div className='list'>
      parts not found
    </div>
    <div className='controls'>
      <a className='btn' onClick={actions.hideList}>cancel</a>
    </div>

  </div>;
}
