import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'reel_actions.dart';

class ReelCard extends StatelessWidget {
  final String author;
  final String caption;
  final String supportingText;
  final VoidCallback? onPrimary;

  const ReelCard({Key? key, required this.author, required this.caption, this.supportingText = 'Short video preview surface', this.onPrimary = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(28), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
      child: Stack(
        children: <Widget>[
          Container(
            width: 9999,
            height: 620,
            decoration: BoxDecoration(color: Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(24)),
            child: Center(
              child: Icon(
                LucideIcons.playCircle,
                color: Color(0xFF111827),
                size: 42,
              ),
            ),
          ),
          Positioned(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: <Widget>[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        author.toString(),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF111827)),
                      ),
                      SizedBox(height: 12),
                      Text(
                        caption.toString(),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF374151)),
                      ),
                      SizedBox(height: 12),
                      Text(
                        supportingText.toString(),
                        style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                      ),
                    ],
                  ),
                ),
                SizedBox(width: 12),
                ReelActions(onPrimary: onPrimary),
              ],
            ),
            left: 16,
            right: 16,
            bottom: 16,
          ),
        ],
      ),
    );
  }
}
