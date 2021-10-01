import React from "react";

const DEBUG = true;

const Debug: React.FC<{
  d: any;
}> = ({ d }) => (DEBUG ? <pre>{JSON.stringify(d, null, 2)}</pre> : null);

export default Debug;
