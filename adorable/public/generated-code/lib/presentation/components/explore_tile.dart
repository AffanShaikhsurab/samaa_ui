import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class ExploreTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData iconData;
  final VoidCallback? onTap;

  const ExploreTile({Key? key, required this.title, required this.subtitle, required this.iconData, this.onTap = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: 164,
        height: 214,
        decoration: BoxDecoration(color: Color(0xFF111827), borderRadius: BorderRadius.circular(24), border: Border.all(color: Color(0xFF1E3A8A), width: 1)),
        child: Stack(
          children: <Widget>[
            Center(
              child: Icon(
                iconData,
                color: Colors.white,
                size: 30,
              ),
            ),
            Positioned(
              child: Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(color: Color(0xFF020617), borderRadius: BorderRadius.circular(18), border: Border.all(color: Color(0xFF334155), width: 1)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      title.toString(),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF111827)),
                    ),
                    SizedBox(height: 4),
                    Text(
                      subtitle.toString(),
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              left: 14,
              right: 14,
              bottom: 14,
            ),
          ],
        ),
      ),
    );
  }
}
