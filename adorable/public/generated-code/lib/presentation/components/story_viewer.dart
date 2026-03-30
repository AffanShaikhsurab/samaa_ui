import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class StoryViewer extends StatelessWidget {
  final String title;
  final String subtitle;
  final String statusText;
  final String primaryLabel;
  final String secondaryLabel;
  final VoidCallback? onPrimary;
  final VoidCallback? onSecondary;

  const StoryViewer({Key? key, required this.title, required this.subtitle, this.statusText = '', this.primaryLabel = 'Close', this.secondaryLabel = 'Next', this.onPrimary = null, this.onSecondary = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(color: Color(0xFF020617), borderRadius: BorderRadius.circular(32), border: Border.all(color: Color(0xFF1E293B), width: 1)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Expanded(
                    child: Container(
                      height: 3,
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
                    ),
                  ),
                  SizedBox(width: 6),
                  Expanded(
                    child: Container(
                      height: 3,
                      decoration: BoxDecoration(color: Color(0xFF334155), borderRadius: BorderRadius.circular(999)),
                    ),
                  ),
                  SizedBox(width: 6),
                  Expanded(
                    child: Container(
                      height: 3,
                      decoration: BoxDecoration(color: Color(0xFF334155), borderRadius: BorderRadius.circular(999)),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Container(
                          height: 3,
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
                        ),
                      ),
                      SizedBox(width: 6),
                      Expanded(
                        child: Container(
                          height: 3,
                          decoration: BoxDecoration(color: Color(0xFF334155), borderRadius: BorderRadius.circular(999)),
                        ),
                      ),
                      SizedBox(width: 6),
                      Expanded(
                        child: Container(
                          height: 3,
                          decoration: BoxDecoration(color: Color(0xFF334155), borderRadius: BorderRadius.circular(999)),
                        ),
                      ),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: <Widget>[
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: <Widget>[
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(border: Border.all(color: Color(0xFFF472B6), width: 1), shape: BoxShape.circle),
                            child: Center(
                              child: Icon(
                                LucideIcons.userCircle,
                                color: Colors.white,
                                size: 18,
                              ),
                            ),
                          ),
                          SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(
                                title.toString(),
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                              ),
                              SizedBox(height: 2),
                              Text(
                                statusText.toString(),
                                style: const TextStyle(fontSize: 12, color: Color(0xFFCBD5E1)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: <Widget>[
                      ElevatedButton(
                        onPressed: onPrimary,
                        style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF0F172A), foregroundColor: Colors.white, padding: EdgeInsets.symmetric(horizontal: 12, vertical: 18), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999))),
                        child: Text(primaryLabel.toString()),
                      ),
                      SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: onSecondary,
                        style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF2563EB), foregroundColor: Colors.white, padding: EdgeInsets.symmetric(horizontal: 12, vertical: 18), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999))),
                        child: Text(secondaryLabel.toString()),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: 16),
          InkWell(
            onTap: onSecondary,
            child: Container(
              width: 9999,
              height: 560,
              decoration: BoxDecoration(color: Color(0xFF111827), borderRadius: BorderRadius.circular(28)),
              child: Center(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.playCircle,
                      color: Color(0xFFF8FAFC),
                      size: 52,
                    ),
                    SizedBox(height: 12),
                    Text(
                      subtitle.toString(),
                      style: const TextStyle(fontSize: 14, color: Color(0xFFCBD5E1)),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(height: 16),
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(color: Color(0xFF020617), borderRadius: BorderRadius.circular(24), border: Border.all(color: Color(0xFF1E293B), width: 1)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  subtitle.toString(),
                  style: const TextStyle(fontSize: 14, color: Color(0xFFCBD5E1)),
                ),
                SizedBox(height: 12),
                Text(
                  'Use the top-right controls to move between stories or return to the feed.',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
