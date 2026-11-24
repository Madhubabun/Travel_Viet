import type { TimeOfDay, Vibe } from '../types';

type S = [name: string, lat: number, lng: number, time: TimeOfDay, vibe: Vibe, note: string];

export const SAMPLE_DAYS: [string, S[]][] = [
  [
    'Old Quarter & Train Street',
    [
      ['Hoan Kiem Lake', 21.0288, 105.8525, 'sunrise', 'nature', 'Slow loop at dawn — tai chi crowds and misty Turtle Tower.'],
      ['Cafe Giang (egg coffee)', 21.0336, 105.8542, 'morning', 'cafe', 'The OG egg coffee. Share one hot, one iced.'],
      ['Hanoi Train Street', 21.0291, 105.8443, 'golden', 'cafe', 'Grab a balcony cafe seat before the evening train.'],
      ['Ta Hien Beer Street', 21.0357, 105.8521, 'night', 'cafe', 'Bia hoi on tiny plastic stools, people-watching.'],
    ],
  ],
  [
    'Lakes, Temples & Long Bien',
    [
      ['Long Bien Bridge', 21.043, 105.859, 'sunrise', 'nature', 'Walk the old iron bridge as the river wakes up.'],
      ['Temple of Literature', 21.0277, 105.8355, 'morning', 'nature', 'Quiet courtyards and frangipani trees.'],
      ['Tran Quoc Pagoda, West Lake', 21.048, 105.8368, 'golden', 'beach', 'Sunset over West Lake — then lotus tea by the water.'],
    ],
  ],
  [
    'Ninh Binh: Tam Coc & Hang Mua',
    [
      ['Hanoi → Ninh Binh limousine van', 21.0245, 105.8412, 'morning', 'transit', '2 hrs south. Book the 7am van.'],
      ['Tam Coc boat ride', 20.2156, 105.9372, 'morning', 'beach', 'Rowers paddle with their feet through three caves.'],
      ['Hang Mua Viewpoint', 20.2311, 105.9332, 'golden', 'nature', '500 steps to the dragon — worth every one at sunset.'],
      ['Tam Coc rice-field homestay', 20.2185, 105.931, 'night', 'stay', 'Bungalow facing the karsts, fireflies at night.'],
    ],
  ],
  [
    'Trang An Caves & Cycling',
    [
      ['Trang An Scenic Landscape', 20.2563, 105.8912, 'sunrise', 'beach', 'Early boat = misty karsts and no crowds.'],
      ['Bich Dong Pagoda', 20.219, 105.92, 'morning', 'nature', 'Cave pagoda built into the mountain.'],
      ['Tam Coc cycling loop', 20.2205, 105.927, 'golden', 'nature', 'Rent bicycles and get lost between rice paddies.'],
    ],
  ],
  [
    'Cat Ba & Lan Ha Bay',
    [
      ['Ninh Binh → Cat Ba bus + ferry', 20.7247, 107.048, 'morning', 'transit', 'Combo ticket, about 4 hrs door to door.'],
      ['Cannon Fort, Cat Ba', 20.718, 107.051, 'golden', 'nature', 'Panoramic sunset over Lan Ha Bay.'],
      ['Cat Ba Town seafood strip', 20.7225, 107.0475, 'night', 'cafe', 'Pick your own squid & clams by the harbour.'],
    ],
  ],
  [
    'Lan Ha Bay Kayak & Hidden Lagoons',
    [
      ['Lan Ha Bay kayak & lagoons', 20.757, 107.082, 'morning', 'beach', 'Paddle into hidden lagoons under limestone arches.'],
      ['Monkey Island beach', 20.779, 107.089, 'golden', 'beach', 'White-sand cove — swim, then hike for the view.'],
      ['Cat Co 2 Beach', 20.714, 107.047, 'night', 'beach', 'Night swim + coconuts at the cliff-side path.'],
    ],
  ],
  [
    'Fly South → Hoi An Lanterns',
    [
      ['Cat Bi Airport, Hai Phong', 20.8188, 106.725, 'morning', 'transit', 'Flight to Da Nang, then Grab to Hoi An (45 min).'],
      ['Japanese Covered Bridge', 15.8771, 108.3262, 'golden', 'nature', 'Golden hour light on the old town walls.'],
      ['Hoi An Ancient Town lanterns', 15.8775, 108.328, 'night', 'cafe', 'Float a paper lantern on the Thu Bon river together.'],
    ],
  ],
  [
    'Tra Que Gardens & An Bang Beach',
    [
      ['Tra Que Vegetable Village', 15.8996, 108.3354, 'morning', 'nature', 'Cycle through herb gardens, farm-to-table lunch.'],
      ['Cam Thanh Coconut Forest', 15.8695, 108.3655, 'morning', 'beach', 'Basket-boat spin in the water coconut palms.'],
      ['An Bang Beach', 15.9147, 108.341, 'golden', 'beach', 'Smoothie bowls, sunbeds and the softest sand.'],
    ],
  ],
  [
    'Da Nang: Son Tra & My Khe',
    [
      ['Linh Ung Pagoda, Son Tra', 16.1003, 108.2778, 'sunrise', 'nature', 'Lady Buddha facing the sea; spot red-shanked doucs.'],
      ['My Khe Beach', 16.0544, 108.247, 'morning', 'beach', 'Long swim, then banh xeo for brunch.'],
      ['Marble Mountains', 16.004, 108.263, 'golden', 'nature', 'Caves and lookout over the coastline.'],
      ['Dragon Bridge', 16.0612, 108.2272, 'night', 'cafe', 'Fire & water show on weekends at 9pm.'],
    ],
  ],
  [
    'Hai Van Pass & Fly Home',
    [
      ['Hai Van Pass', 16.1925, 108.13, 'sunrise', 'nature', 'Jeep or motorbike up the cloud pass — coast on both sides.'],
      ['Han Market', 16.0682, 108.2238, 'morning', 'cafe', 'Coffee beans, dried mango and souvenirs.'],
      ['Da Nang International Airport', 16.0439, 108.1994, 'golden', 'transit', 'Head back with sandy shoes.'],
    ],
  ],
];

