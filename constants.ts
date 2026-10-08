export const GAME_WIDTH = 420
export const GAME_HEIGHT = 720

export const ROAD_LEFT = 50
export const ROAD_WIDTH = 320
export const LANE_COUNT = 4
export const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT

export const PLAYER_W = 46
export const PLAYER_H = 98
export const PLAYER_Y = GAME_HEIGHT - 120
export const PLAYER_MIN_X = ROAD_LEFT + 16 + PLAYER_W / 2
export const PLAYER_MAX_X = ROAD_LEFT + ROAD_WIDTH - 16 - PLAYER_W / 2
export const STEER_SPEED = 520

export const BASE_SPEED = 420
export const MAX_SPEED = 1100
export const ACCELERATION = 9
export const TRAFFIC_FACTOR = 1.3

export const COIN_RADIUS = 13
export const COIN_VALUE = 10
export const DISTANCE_PER_POINT = 100

export const KMH_PER_PX = 0.2773

export const HIGH_SCORE_KEY = 'm5cs-traffic-dash-highscore'

export function laneCenter(lane: number) {
  return ROAD_LEFT + LANE_WIDTH * lane + LANE_WIDTH / 2
}
