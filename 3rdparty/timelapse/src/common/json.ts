export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export type JsonObject = { [member: string]: JsonValue };
export interface JsonArray extends Array<JsonValue> {}

export type JsonSerializable = JsonArray | JsonObject;
