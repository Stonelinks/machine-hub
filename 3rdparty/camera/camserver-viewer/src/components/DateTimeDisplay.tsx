import React from "react";
import moment from "moment";

const DateTimeDisplay: React.FC<{
  ts: string;
}> = ({ ts }) => {
  return (
    <div
      style={{
        display: "inline-block",
        marginLeft: "8px",
        color: "grey",
        fontSize: "10pt",
      }}
    >
      {moment(ts).format("ddd, MMM Do YYYY, h:mm a")}
    </div>
  );
};

export default DateTimeDisplay;
