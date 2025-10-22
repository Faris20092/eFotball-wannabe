# 🎮 Reserves & Auto-Scroll Feature

## ✅ **New Features Added:**

### **1. Reserves Section** 📦
A third storage area for your players!

**Structure:**
- **Squad** (11 players) - Your starting XI
- **Bench** (Max 8 players) - Substitutes
- **Reserves** (Unlimited) - Extra players

### **2. Auto-Scroll** 🔄
Page automatically scrolls when dragging near top/bottom!

---

## 🎯 **How Reserves Work:**

### **What are Reserves?**
- Extra player storage beyond the 8-player bench limit
- Unlimited capacity
- Players can be moved between Squad ↔ Bench ↔ Reserves

### **Visual Design:**
- **Blue border** (vs yellow for bench)
- **Blue accent** color
- Located below bench section

---

## 🔄 **All Drag & Drop Combinations:**

### **Squad ↔ Bench ↔ Reserves:**

```
Squad → Bench ✅
Squad → Reserves ✅
Bench → Squad ✅
Bench → Reserves ✅
Reserves → Squad ✅
Reserves → Bench ✅
Available → Squad ✅
Available → Bench ✅
Available → Reserves ✅
```

### **Examples:**

#### **1. Move Player to Reserves:**
```
Drag player from Squad
Drop on Reserves section
→ Player moves to reserves
→ Squad position becomes empty
```

#### **2. Promote from Reserves:**
```
Drag player from Reserves
Drop on Squad position
→ Player joins squad
→ If position occupied, old player goes to reserves
```

#### **3. Bench Full? Use Reserves:**
```
Bench has 8 players (full)
Drag 9th player to Reserves
→ Stored in reserves instead
→ No limit!
```

---

## 📜 **Auto-Scroll Feature:**

### **How It Works:**
When dragging a player, the page automatically scrolls if you're near the edge!

### **Scroll Zones:**
```
┌─────────────────────┐
│ ↑ Scroll Up Zone    │ ← Top 100px
├─────────────────────┤
│                     │
│   Normal Zone       │
│   (no scroll)       │
│                     │
├─────────────────────┤
│ ↓ Scroll Down Zone  │ ← Bottom 100px
└─────────────────────┘
```

### **Usage:**
1. **Start dragging** a player
2. **Move mouse** near top of screen → Auto-scrolls up
3. **Move mouse** near bottom → Auto-scrolls down
4. **Drop player** → Scrolling stops

### **Settings:**
- **Scroll Zone:** 100 pixels from edge
- **Scroll Speed:** 10 pixels per frame
- **Smooth** and automatic

---

## 🎨 **Visual Indicators:**

### **Bench (Yellow):**
```css
🪑 Bench (Max 8 players - Drag here)
Border: Yellow dashed
Highlight: Yellow glow when dragging over
```

### **Reserves (Blue):**
```css
📦 Reserves (Drag here)
Border: Blue dashed
Highlight: Blue glow when dragging over
```

---

## 💡 **Use Cases:**

### **Case 1: Organize Your Collection**
```
Squad: Your best 11 players
Bench: Top 8 substitutes
Reserves: Rest of your collection
```

### **Case 2: Rotation System**
```
Week 1: Player A in squad
Week 2: Swap Player A to reserves, Player B to squad
Easy rotation!
```

### **Case 3: Bench Full**
```
Already have 8 bench players
New player arrives
→ Put in reserves
→ Swap later when needed
```

---

## 🎯 **Drag & Drop Examples:**

### **Example 1: Squad → Reserves**
```
1. Grab player from CMF position
2. Drag down to Reserves section (blue box)
3. Page auto-scrolls as you approach bottom
4. Drop on reserves
5. Player moves to reserves
6. CMF position now empty
```

### **Example 2: Reserves → Squad**
```
1. Scroll down to reserves
2. Grab reserve player
3. Drag up toward squad
4. Page auto-scrolls as you approach top
5. Drop on squad position
6. Player joins squad
```

### **Example 3: Bench → Reserves**
```
1. Bench is full (8 players)
2. Need to add new player to bench
3. Drag one bench player to reserves
4. Now bench has space
5. Add new player to bench
```

---

## 🚀 **Quick Actions:**

### **Free Up Bench Space:**
```
Drag bench player → Drop on reserves
→ Bench space freed
```

### **Promote Reserve Player:**
```
Drag reserve player → Drop on squad
→ Instant promotion
```

### **Swap Squad Players:**
```
Drag squad player → Drop on another position
→ They swap
```

### **Long-Distance Drag:**
```
Drag from top → Auto-scroll down → Drop at bottom
→ Smooth scrolling all the way
```

---

## 📊 **Capacity Limits:**

| Section | Limit | Notes |
|---------|-------|-------|
| **Squad** | 11 players | Starting XI |
| **Bench** | 8 players | Max limit enforced |
| **Reserves** | Unlimited | No limit! |

---

## 🎮 **Keyboard & Mouse:**

- **Grab** - Click and hold player
- **Drag** - Move mouse while holding
- **Near Edge** - Auto-scroll activates
- **Drop** - Release mouse button
- **Escape** - Cancel drag (browser default)

---

## ✅ **Benefits:**

### **1. Better Organization**
- Clear separation: Squad / Bench / Reserves
- Easy to see who's where

### **2. No More Scrolling Hassle**
- Auto-scroll handles long drags
- Smooth experience

### **3. Unlimited Storage**
- Reserves have no limit
- Store entire collection

### **4. Flexible Management**
- Easy swaps between all sections
- Drag anywhere to anywhere

---

## 🐛 **Troubleshooting:**

### **Auto-scroll not working?**
- Make sure you're dragging (not just hovering)
- Move mouse within 100px of top/bottom edge

### **Can't drop on reserves?**
- Look for blue highlight when dragging over
- Make sure reserves section is visible

### **Player not moving?**
- Check for duplicate alerts
- Ensure player isn't already in that section

---

## 🎉 **Summary:**

✅ **Reserves section** - Unlimited player storage
✅ **Auto-scroll** - Smooth dragging experience  
✅ **Full drag & drop** - Squad ↔ Bench ↔ Reserves
✅ **Visual feedback** - Yellow (bench) / Blue (reserves)
✅ **No limits** - Store as many players as you want in reserves

**Enjoy the enhanced squad management!** ⚽🎮
