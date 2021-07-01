import React, { ReactNode } from "react";

const ExpandableSection: React.FC<{
  title: ReactNode;
  startOpened: boolean;
  children: any | any[];
}> = (
  { title, children, startOpened } = {
    title: "Section",
    startOpened: false,
    children: null,
  },
) => {
  const [isExpanded, setIsExpanded] = React.useState(startOpened);

  const onToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <div style={{ display: "inline-block" }}>{title}</div>
      <a
        style={{
          marginLeft: "10px",
          backgroundColor: "lightgrey",
          paddingLeft: "4px",
          paddingRight: "4px",
          cursor: "pointer",
        }}
        onClick={onToggleExpanded}
      >
        {`click to ${isExpanded ? "hide" : "expand"} section`}
      </a>

      <div>{isExpanded ? children : null}</div>
    </div>
  );
};

export default ExpandableSection;
