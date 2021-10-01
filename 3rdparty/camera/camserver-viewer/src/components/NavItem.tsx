import React from "react";

// tslint:disable-next-line:no-var-requires
const { Link } = require("react-location");

export default ({ to, title }: { to: string; title: string }) => (
  <Link
    to={to}
    getActiveProps={() => ({
      style: { display: "inline-block", textDecoration: "underline" },
    })}
    style={{
      fontWeight: "bold",
      marginRight: "10px",
      marginBottom: "10px",
      fontSize: "24px",
      textDecoration: "none",
    }}
  >
    {title}
  </Link>
);
