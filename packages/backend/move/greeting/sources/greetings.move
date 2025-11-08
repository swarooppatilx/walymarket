// Copyright (c) Konstantin Komelin and other contributors
// SPDX-License-Identifier: MIT

/// Module: greeting
module greeting::greeting;

use std::string::{utf8, String};
use sui::display;
use sui::event::emit;
use sui::package;
use sui::random::{Random, new_generator};

// === Imports ===

// === Constants ===

// Deprecated greeting module intentionally left blank after migration to `walymarket`.
module greeting::greeting {}
const MaxEmojiIndex: u8 = 64;
