import 'package:flutter/material.dart';

class StoryBubble extends StatelessWidget {
  final String label;
  final IconData iconData;
  final bool viewed;
  final VoidCallback? onTap;

  const StoryBubble({Key? key, required this.label, required this.iconData, this.viewed = false, this.onTap = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          if (viewed) Container(
            width: 76,
            height: 76,
            padding: EdgeInsets.all(2),
            decoration: BoxDecoration(color: Color(0xFFF1F5F9), border: Border.all(color: Color(0xFFCBD5E1), width: 1), shape: BoxShape.circle),
            child: Center(
              child: CircleAvatar(
                child: Text(
                  label.isNotEmpty ? label[0].toUpperCase() : 'P',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
                ),
                radius: 28,
                backgroundColor: Color(0xFF1D4ED8),
              ),
            ),
          ),
          if (!(viewed)) Container(
            width: 76,
            height: 76,
            padding: EdgeInsets.all(2),
            decoration: BoxDecoration(color: Color(0xFFEFF6FF), border: Border.all(color: Color(0xFF2563EB), width: 1), shape: BoxShape.circle),
            child: Center(
              child: CircleAvatar(
                child: Text(
                  label.isNotEmpty ? label[0].toUpperCase() : 'P',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
                ),
                radius: 28,
                backgroundColor: Color(0xFF1D4ED8),
              ),
            ),
          ),
          SizedBox(height: 10),
          Text(
            label.toString(),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF111827)),
          ),
        ],
      ),
    );
  }
}
