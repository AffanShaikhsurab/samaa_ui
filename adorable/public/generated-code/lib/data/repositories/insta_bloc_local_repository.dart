import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../bloc/insta_bloc_state.dart';

class InstaBlocLocalRepository {
  const InstaBlocLocalRepository();

  Future<InstaBlocState?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('insta_bloc_state');
    if (raw == null || raw.isEmpty) return null;
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return InstaBlocState.fromJson(decoded);
  }

  Future<void> save(InstaBlocState state) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('insta_bloc_state', jsonEncode(state.toJson()));
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('insta_bloc_state');
  }
}
