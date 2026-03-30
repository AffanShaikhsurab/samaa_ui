import 'package:flutter/material.dart';

import 'reel_card.dart';

class ReelPager extends StatelessWidget {
  final dynamic items;
  final String title;
  final String subtitle;

  const ReelPager({Key? key, required this.items, this.title = 'Reels', this.subtitle = 'Short-form highlights'})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(24), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
      child: Stack(
        children: <Widget>[
          PageView(
            children: <Widget>[for (final reel in items) ReelCard(
              author: reel.author,
              caption: reel.caption,
            )],
          ),
          Positioned(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: <Widget>[
                Text(
                  title.toString(),
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF111827)),
                ),
                Text(
                  subtitle.toString(),
                  style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                ),
              ],
            ),
            top: 16,
            left: 16,
            right: 16,
          ),
        ],
      ),
    );
  }
}
