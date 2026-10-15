import { defineRoom, defineServer } from "colyseus";
import { GameRoom } from "./room";

const port = Number.parseInt(process.env.PORT || "2567", 10);

const server = defineServer({
 rooms: {
  game_room: defineRoom(GameRoom),
 },
 express: app => {
  app.get('/', (req, res) => {
    res.send('Colyseeus game server is running!');
  });
 },
 devMode: true,
});
await server.listen(port);
