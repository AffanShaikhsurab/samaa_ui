import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class MessageNoticeBanner extends StatelessWidget {
  final String text;
  final VoidCallback? onDismiss;

  const MessageNoticeBanner({Key? key, required this.text, this.onDismiss = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(color: Color(0xFF1C1C1E), borderRadius: BorderRadius.circular(14)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          Expanded(
            child: Text(
              text.toString(),
              style: const TextStyle(fontSize: 13, color: Colors.white),
            ),
          ),
          SizedBox(width: 10),
          InkWell(
            onTap: onDismiss,
            child: Icon(
              LucideIcons.x,
              color: Color(0xFF8E8E8E),
              size: 16,
            ),
          ),
        ],
      ),
    );
  }
}
