exports.up = (pgm) => {
  pgm.createTable("rooms", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    name: { type: "varchar(255)", notNull: true },
    type: { type: "varchar(20)", notNull: true, check: "type IN ('code', 'whiteboard', 'both')" },
    created_by: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("rooms");
};
