import React from 'react';

/**
 * Marks a value as protected: copying it (Ctrl/Cmd+C, context menu) records an audit event
 * with the record id and field name via SecurityShield. The copied text is never logged.
 */
export const Protected = ({ type, id, field, as: Tag = 'span', className = '', children }) => (
  <Tag data-protected-type={type} data-protected-id={id || undefined} data-protected-field={field} className={className}>
    {children}
  </Tag>
);

export default Protected;
