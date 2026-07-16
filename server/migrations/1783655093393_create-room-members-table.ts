exports.up = (pgm) => {
  pgm.createTable("room_members", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    room_id: { type: "uuid", notNull: true, references: "rooms", onDelete: "CASCADE" },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    joined_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.addConstraint("room_members", "unique_room_user", {
    unique: ["room_id", "user_id"],
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("room_members", "unique_room_user");
  pgm.dropTable("room_members");
};
