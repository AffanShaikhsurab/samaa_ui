import 'package:meta/meta.dart';

@immutable
class ExploreItem {
  final int id;
  final String title;
  final String subtitle;

  const ExploreItem({required this.id, required this.title, required this.subtitle});

  static ExploreItem fromJson(Map<String, dynamic> json) {
    return ExploreItem(id: json['id'] as int, title: json['title'] as String, subtitle: json['subtitle'] as String);
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'subtitle': subtitle,
    };
  }

  ExploreItem copyWith({int? id, String? title, String? subtitle}) {
    return ExploreItem(id: id ?? this.id, title: title ?? this.title, subtitle: subtitle ?? this.subtitle);
  }
}
